import { ProvideAuth } from "@contexts/auth";
import { ProvideSettings } from "@contexts/settings";
import { ProvideVault } from "@contexts/vault";

export default function Contexts({ children }: { children: React.ReactNode }) {
    return (
        <ProvideAuth>
            <ProvideVault>
                <ProvideSettings>{children}</ProvideSettings>
            </ProvideVault>
        </ProvideAuth>
    );
}
