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
        "count": RoutingTree(
            segment="count",
            encrypted_routes={
                "GET": EncryptedRoute(),
            },
        ),
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
MERKLE_ROUTING_TREE = RoutingTree(
    segment="merkle",
    subtrees={
        "attestation": RoutingTree(
            segment="attestation",
            encrypted_routes={
                "GET": EncryptedRoute(),
            },
        ),
        "attestations": RoutingTree(
            segment="attestations",
            encrypted_routes={
                "GET": EncryptedRoute(),
            },
        ),
        "content-mac-inputs": RoutingTree(
            segment="content-mac-inputs",
            encrypted_routes={
                "POST": EncryptedRoute(),
            },
        ),
        "proof": RoutingTree(
            segment="proof",
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
                "PUT": EncryptedRoute(),
            },
        ),
    },
)

ROUTING_TREE = RoutingTree(
    segment="api",
    subtrees={
        "auth": AUTH_ROUTING_TREE,
        "files": FILES_ROUTING_TREE,
        "merkle": MERKLE_ROUTING_TREE,
        "users": USERS_ROUTING_TREE,
    },
)
