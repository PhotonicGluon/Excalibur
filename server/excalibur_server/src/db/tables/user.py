from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class User(Base):
    __tablename__ = "User"

    uuid: Mapped[str] = mapped_column(String(36), nullable=False, primary_key=True)
    username: Mapped[str] = mapped_column(Text(), nullable=False, unique=True)

    # Magic methods
    def __repr__(self) -> str:
        return f"User<{self.uuid!r}>"
