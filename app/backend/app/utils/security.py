from fastapi import Depends, HTTPException
from fastapi_jwt_auth import AuthJWT

def require_admin(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    claims = Authorize.get_raw_jwt()
    if claims.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized action")
    return claims
