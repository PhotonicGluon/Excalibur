from .structures import EncryptedRoute, RoutingTree

AUTH_ROUTING_TREE = RoutingTree(
    segment="auth",
    subtrees={
        "pop-demo": RoutingTree(
            segment="pop-demo",
            subtrees={
                "encrypted": RoutingTree(
                    segment="encrypted",
                    encrypted_routes={
                        "POST": EncryptedRoute(),
                    },
                )
            },
        ),
        "token": RoutingTree(
            segment="token",
            encrypted_routes={
                "GET": EncryptedRoute(),
            },
        ),
    },
)
FILES_ROUTING_TREE = RoutingTree(
    segment="files",
    subtrees={
        # Under "file"
        "download": RoutingTree(
            segment="download",
            has_path_param=True,
            encrypted_routes={
                "GET": EncryptedRoute(),
            },
        ),
        "search": RoutingTree(
            segment="search",
            encrypted_routes={
                "POST": EncryptedRoute(),
            },
        ),
        "upload": RoutingTree(
            segment="upload",
            has_path_param=True,
            encrypted_routes={
                "POST": EncryptedRoute(),
            },
        ),
        # Under "folder"
        "mkdir": RoutingTree(
            segment="mkdir",
            has_path_param=True,
            encrypted_routes={
                "POST": EncryptedRoute(),
            },
        ),
        "list": RoutingTree(
            segment="list",
            has_path_param=True,
            encrypted_routes={
                "GET": EncryptedRoute(),
            },
        ),
        # In the root
        "all": RoutingTree(
            segment="all",
            encrypted_routes={
                "GET": EncryptedRoute(),
            },
        ),
        "move": RoutingTree(
            segment="move",
            has_path_param=True,
            encrypted_routes={
                "POST": EncryptedRoute(),
            },
        ),
        "rename": RoutingTree(
            segment="rename",
            has_path_param=True,
            encrypted_routes={
                "POST": EncryptedRoute(),
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
        "info": RoutingTree(
            segment="info",
            has_path_param=True,
            encrypted_routes={
                "GET": EncryptedRoute(),
            },
        ),
        "edit-info": RoutingTree(
            segment="edit-info",
            has_path_param=True,
            encrypted_routes={
                "POST": EncryptedRoute(),
            },
        ),
    },
)

ROUTING_TREE = RoutingTree(
    segment="api",
    subtrees={
        "auth": AUTH_ROUTING_TREE,
        "files": FILES_ROUTING_TREE,
        "users": USERS_ROUTING_TREE,
    },
)
