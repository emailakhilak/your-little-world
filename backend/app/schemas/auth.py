
from pydantic import BaseModel


class AuthMeResponse(BaseModel):
    authenticated: bool = True
    user_id: str
    email: str | None = None
    role: str | None = "authenticated"
    message: str = "Authentication token successfully verified"
