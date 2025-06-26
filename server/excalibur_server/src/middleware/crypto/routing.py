from fastapi import status

from .structures import EncryptedRoute, RoutingTree

FILES_ROUTING_TREE = RoutingTree(
    segment="files",
    subtrees={
        "list": RoutingTree(
            segment="list",
            has_path_param=True,
            encrypted_routes={
                "GET": EncryptedRoute(),
            },
        ),
        "upload": RoutingTree(
            segment="upload",
            has_path_param=True,
            encrypted_routes={
                "POST": EncryptedRoute(),
            },
        ),
        "download": RoutingTree(
            segment="download",
            has_path_param=True,
            encrypted_routes={
                "GET": EncryptedRoute(),
            },
        ),
    },
)
SECURITY_ROUTING_TREE = RoutingTree(
    segment="security",
    subtrees={
        "login": RoutingTree(
            segment="login",
            encrypted_routes={
                "POST": EncryptedRoute(encrypted_body=False, excluded_statuses=[status.HTTP_404_NOT_FOUND]),
            },
        ),
        "vault-key": RoutingTree(
            segment="vault-key",
            encrypted_routes={
                "GET": EncryptedRoute(),
                "POST": EncryptedRoute(),
            },
        ),
    },
)

ROUTING_TREE = RoutingTree(
    segment="api",
    subtrees={
        "v1": RoutingTree(
            segment="v1",
            subtrees={
                "files": FILES_ROUTING_TREE,
                "security": SECURITY_ROUTING_TREE,
            },
        ),
    },
)
