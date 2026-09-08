"""Canonical router registry for the application.

Only the supported canonical modules are exported here.
Legacy duplicate modules remain in the repository but are not registered.
"""

from . import auth, decision, user

AUTH_ROUTER = auth.router
USER_ROUTER = user.router
DECISION_ROUTER = decision.router

__all__ = [
    "AUTH_ROUTER",
    "USER_ROUTER",
    "DECISION_ROUTER",
]