from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi_jwt_auth import AuthJWT
from passlib.hash import bcrypt
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from pydantic import BaseModel, EmailStr, constr, validator
from uuid import uuid4
from datetime import timedelta, datetime
import redis
import logging
import re
import os
from app.utils.utils import enviar_correo

# Configura Redis para invalidar tokens y rate limiting
REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)

router = APIRouter(tags=["Password Management"])

logger = logging.getLogger("password_events")
logging.basicConfig(level=logging.INFO)

RESET_TOKEN_EXPIRE_MINUTES = 15
RESET_TOKEN_PREFIX = "reset_token:"
RATE_LIMIT_PREFIX = "rate_limit:"

class RequestResetSchema(BaseModel):
    email: EmailStr

class ResetPasswordSchema(BaseModel):
    token: str
    new_password: constr(min_length=8)

    @validator("new_password")
    def password_complexity(cls, v):
        if not re.search(r"[A-Z]", v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula")
        if not re.search(r"\d", v):
            raise ValueError("La contraseña debe contener al menos un número")
        if not re.search(r"[^A-Za-z0-9]", v):
            raise ValueError("La contraseña debe contener al menos un carácter especial")
        common_passwords = {"password", "12345678", "admin", "qwerty"}
        if v.lower() in common_passwords:
            raise ValueError("La contraseña es demasiado común")
        return v

class ChangePasswordSchema(BaseModel):
    current_password: str
    new_password: constr(min_length=8)
    
    @validator("new_password")
    def password_complexity(cls, v):
        if not re.search(r"[A-Z]", v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula")
        if not re.search(r"\d", v):
            raise ValueError("La contraseña debe contener al menos un número")
        if not re.search(r"[^A-Za-z0-9]", v):
            raise ValueError("La contraseña debe contener al menos un carácter especial")
        common_passwords = {"password", "12345678", "admin", "qwerty"}
        if v.lower() in common_passwords:
            raise ValueError("La contraseña es demasiado común")
        return v

# Helper function for rate limiting
def is_rate_limited(identifier: str, limit: int = 5, window: int = 300) -> bool:
    key = f"{RATE_LIMIT_PREFIX}{identifier}"
    attempts = redis_client.get(key)
    if attempts and int(attempts) >= limit:
        return True
    redis_client.incr(key)
    redis_client.expire(key, window)
    return False

@router.post("/request-reset")
def request_password_reset(request_data: RequestResetSchema, Authorize: AuthJWT = Depends(), db: Session = Depends(get_db), request: Request = None):
    if is_rate_limited(request_data.email):
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes. Intenta más tarde.")

    user = db.query(User).filter(User.email == request_data.email).first()
    if user:
        jti = str(uuid4())
        expires = timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
        reset_token = Authorize.create_access_token(
            subject=str(user.id),
            expires_time=expires,
            user_claims={"purpose": "password_reset", "jti": jti}
        )
        redis_client.setex(f"{RESET_TOKEN_PREFIX}{jti}", expires, "valid")
        enlace = f"https://app/resetear-contrasena?token={reset_token}"
        asunto = "Enlace para restablecer tu contraseña"
        mensaje = f"Hola, haz clic en el siguiente enlace para restablecer tu contraseña:\n\n{enlace}\n\nEste enlace expirará en 15 minutos."

        enviar_correo(user.email, asunto, mensaje)
        logger.info(f"Reset token enviado a {user.email} desde IP {request.client.host if request else 'N/A'}")

    return {"message": "Si el correo está registrado, se ha enviado un enlace para restablecer la contraseña."}

@router.post("/reset-password")
def reset_password(data: ResetPasswordSchema, Authorize: AuthJWT = Depends(), db: Session = Depends(get_db), request: Request = None):
    try:
        decoded = Authorize.get_raw_jwt(data.token)
        if decoded.get("purpose") != "password_reset":
            raise HTTPException(status_code=400, detail="Token inválido para esta operación.")
        jti = decoded.get("jti")
        if not redis_client.get(f"{RESET_TOKEN_PREFIX}{jti}"):
            raise HTTPException(status_code=400, detail="Token ya utilizado o expirado.")

        user_id = int(decoded["sub"])
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado.")

        user.password = bcrypt.hash(data.new_password)
        db.commit()
        redis_client.delete(f"{RESET_TOKEN_PREFIX}{jti}")
        logger.info(f"Usuario {user.id} restableció su contraseña desde IP {request.client.host if request else 'N/A'}")
        return {"message": "Contraseña restablecida con éxito."}
    except Exception:
        raise HTTPException(status_code=400, detail="Token inválido o expirado.")

@router.post("/change-password")
def change_password(data: ChangePasswordSchema, Authorize: AuthJWT = Depends(), db: Session = Depends(get_db), request: Request = None):
    Authorize.jwt_required()
    user_id = int(Authorize.get_jwt_subject())

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not bcrypt.verify(data.current_password, user.password):
        raise HTTPException(status_code=401, detail="Contraseña actual incorrecta.")

    user.password = bcrypt.hash(data.new_password)
    db.commit()
    logger.info(f"Usuario {user.id} cambió su contraseña desde IP {request.client.host if request else 'N/A'}")
    return {"message": "Contraseña cambiada correctamente."}
