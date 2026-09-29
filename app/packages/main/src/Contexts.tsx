import { ProvideAuth } from "@components/auth/context";
import { ProvideMerkle } from "@components/merkle/context";
import { ProvideSettings } from "@components/settings/context";

export default function Contexts({ children }: { children: React.ReactNode }) {
    return (
        <ProvideSettings>
            <ProvideAuth>
                <ProvideMerkle>{children}</ProvideMerkle>
            </ProvideAuth>
        </ProvideSettings>
    );
}
