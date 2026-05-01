import { IonBreadcrumb, IonBreadcrumbs, IonIcon } from "@ionic/react";
import { chevronForward, home } from "ionicons/icons";

import { SubstitutionCipher } from "@lib/files/obfuscation";

interface ContainerProps extends React.HTMLProps<HTMLIonBreadcrumbsElement> {
    /**
     * Path to the directory.
     *
     * Use `.` to specify the root directory.
     */
    path: string;
    /** Optional Name Obfuscation Cipher (NOC) to decipher fragment names */
    noc?: SubstitutionCipher;
}

const DirectoryBreadcrumbs: React.FC<ContainerProps> = (props) => {
    const breadcrumbPaths = [""].concat(props.path.split("/").filter((p) => p !== "."));

    return (
        <IonBreadcrumbs {...props}>
            {breadcrumbPaths.map((fragment, idx) => {
                const routerLink = idx === 0 ? "/files/" : `/files/${breadcrumbPaths.slice(1, idx + 1).join("/")}`;
                const displayFragment = props.noc ? props.noc.decipher(fragment).toString("utf-8") : fragment;

                return (
                    <IonBreadcrumb key={idx} routerLink={routerLink} routerDirection="back">
                        {idx === 0 ? (
                            <IonIcon slot="" icon={home} />
                        ) : (
                            <span className="max-w-64 truncate">{displayFragment}</span>
                        )}
                        <IonIcon slot="separator" icon={chevronForward} />
                    </IonBreadcrumb>
                );
            })}
        </IonBreadcrumbs>
    );
};

export default DirectoryBreadcrumbs;
