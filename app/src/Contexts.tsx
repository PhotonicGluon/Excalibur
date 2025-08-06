import { ProvideAuth } from "@contexts/auth";
import { ProvideSettings } from "@contexts/settings";

export default function Contexts({ children }: { children: React.ReactNode }) {
    return (
        <ProvideSettings>
            <ProvideAuth>{children}</ProvideAuth>
        </ProvideSettings>
    );
}
