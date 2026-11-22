/**
 * Checks whether a name can be used for an item.
 *
 * @param name the name to check
 * @returns an error message if the name is invalid, or `null` if the name is valid
 */
export function validateName(name: string): string | null {
    if (name === "") {
        return "Name cannot be empty";
    }
    if (name === "." || name === "..") {
        return `Name cannot be '${name}'`;
    }
    if (name.includes("/")) {
        return "Name cannot contain '/'";
    }
    return null;
}
