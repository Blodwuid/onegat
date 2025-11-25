from fastapi import APIRouter, Depends, HTTPException
from fastapi_jwt_auth import AuthJWT
from app.settings import Settings  # Importa la configuración
from passlib.hash import bcrypt
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import RegisterSchema, LoginSchema, UserResponse
from pydantic import EmailStr
from datetime import datetime

auth_router = APIRouter()

# Configuración para AuthJWT
@AuthJWT.load_config
def get_config():
    return Settings()

def get_current_user(Authorize: AuthJWT = Depends(), db: Session = Depends(get_db)):
    try:
        Authorize.jwt_required()  # Verifica que el usuario tenga un token válido
        user_id = Authorize.get_jwt_subject()  # Obtiene el ID del usuario desde el token

        # Busca al usuario en la base de datos
        usuario = db.query(User).filter(User.id == int(user_id)).first()
        if not usuario:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return usuario

    except Exception as e:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

@auth_router.post('/register', tags=["Authentication"])
def register(user: RegisterSchema, db: Session = Depends(get_db)):
    # Si el rol es 'voluntario', el email es obligatorio
    if user.role == "voluntario" and not user.email:
        raise HTTPException(status_code=400, detail="El email es obligatorio para voluntarios.")
    
    # Verificar si el username ya existe
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Verificar si el email ya existe para evitar duplicados
    if user.email:
        existing_email = db.query(User).filter(User.email == user.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="El email ya está registrado.")
    
    # Hashear la contraseña antes de guardarla
    hashed_password = bcrypt.hash(user.password)
    new_user = User(username=user.username, password=hashed_password, role=user.role, email=user.email)
    
    db.add(new_user)
    db.commit()
    
    return {"message": "User created successfully"}

@auth_router.post('/login', tags=["Authentication"])
def login(user: LoginSchema, Authorize: AuthJWT = Depends(), db: Session = Depends(get_db)):
    # Busca al usuario en la base de datos
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not bcrypt.verify(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verificación de términos
    if not db_user.accepted_terms:
        if not user.accepted_terms:
            raise HTTPException(
                status_code=400,
                detail="Debes aceptar los términos y condiciones para iniciar sesión."
            )
        # Guardamos aceptación
        db_user.accepted_terms = True
        db_user.accepted_terms_date = datetime.utcnow()
        db.commit()

    # Usa el ID del usuario como el "subject" del token
    access_token = Authorize.create_access_token(
        subject=str(db_user.id),  # El subject debe ser un string o integer
        user_claims={"username": db_user.username, "role": db_user.role}  # Claims personalizados
    )
    refresh_token = Authorize.create_refresh_token(
        subject=str(db_user.id),  # También puedes usar el mismo "subject"
        user_claims={"username": db_user.username, "role": db_user.role}  # Claims personalizados
    )

    return {"access_token": access_token, "refresh_token": refresh_token}

@auth_router.get("/me", response_model=UserResponse, tags=["Authentication"])
def get_current_user_info(user: User = Depends(get_current_user)):
    return user

@auth_router.post("/accept-demo-terms")
def accept_demo_terms(db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    user_id = Authorize.get_jwt_subject()

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.accepted_demo_terms = True
    user.accepted_demo_terms_date = datetime.utcnow()
    db.commit()
    return {"message": "Términos demo aceptados correctamente"}
