import { ProvideAuth } from "@components/auth/context";
import { ProvideVaultIndex } from "@components/files/context";
import { ProvideMerkle } from "@components/merkle/context";
import { ProvideNamesMigration } from "@components/migration/context";
import { ProvideSettings } from "@components/settings/context";

export default function Contexts({ children }: { children: React.ReactNode }) {
    return (
        <ProvideSettings>
            <ProvideAuth>
                <ProvideMerkle>
                    <ProvideVaultIndex>
                        <ProvideNamesMigration>{children}</ProvideNamesMigration>
                    </ProvideVaultIndex>
                </ProvideMerkle>
            </ProvideAuth>
        </ProvideSettings>
    );
}
