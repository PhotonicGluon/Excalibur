from fastapi import status
from pydantic import BaseModel


class EncryptedRoute(BaseModel):
    encrypted_body: bool = True
    "Whether the body of the request is encrypted"

    encrypted_response: bool = True
    "Whether the response is encrypted"

    excluded_statuses: list[int] = [status.HTTP_401_UNAUTHORIZED]
    "List of status codes for which the response should not be encrypted"

    @property
    def is_encrypted(self) -> bool:
        return self.encrypted_body or self.encrypted_response


class RoutingTree(BaseModel):
    segment: str
    subtrees: dict[str, "RoutingTree"] = {}
    encrypted_routes: dict[str, EncryptedRoute] = {}

    def traverse(self, path: str) -> dict[str, EncryptedRoute]:
        """
        Traverses the routing tree to find encrypted routes for a given path.

        :param path: The path to traverse, starting from the root of the routing tree.
        :return: A dictionary of HTTP methods to their corresponding encrypted route configurations
                if the path matches a segment in the routing tree, otherwise an empty dictionary.
        """

        path = path.removeprefix("/").removesuffix("/")
        if path == self.segment:
            return self.encrypted_routes

        next_path = path.removeprefix(self.segment + "/")
        next_segment = next_path.split("/")[0]
        subtree = self.subtrees.get(next_segment)

        if subtree is None:
            return {}

        return subtree.traverse(next_path)


# Routing trees
FILES_ROUTING_TREE = RoutingTree(
    segment="files",
    subtrees={
        "list": RoutingTree(
            segment="list",
            encrypted_routes={
                "GET": EncryptedRoute(),
            },
        ),
    },
)
SECURITY_ROUTING_TREE = RoutingTree(
    segment="security",
    subtrees={
        "generate-token": RoutingTree(
            segment="generate-token",
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
