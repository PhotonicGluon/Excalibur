import { ProvideAuth } from "@components/auth/context";
import { ProvideSettings } from "@components/settings/context";

export default function Contexts({ children }: { children: React.ReactNode }) {
    return (
        <ProvideSettings>
            <ProvideAuth>{children}</ProvideAuth>
        </ProvideSettings>
    );
}
