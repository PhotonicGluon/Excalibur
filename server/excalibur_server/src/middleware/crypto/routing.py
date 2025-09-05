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
        "mkdir": RoutingTree(
            segment="mkdir",
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
USERS_ROUTING_TREE = RoutingTree(
    segment="users",
    subtrees={
        "vault": RoutingTree(
            segment="vault",
            has_path_param=True,
            encrypted_routes={
                "GET": EncryptedRoute(),
            },
        ),
    },
)

ROUTING_TREE = RoutingTree(
    segment="api",
    subtrees={
        "files": FILES_ROUTING_TREE,
        "users": USERS_ROUTING_TREE,
    },
)
