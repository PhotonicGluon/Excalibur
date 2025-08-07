import { IonBreadcrumb, IonBreadcrumbs, IonIcon } from "@ionic/react";
import { chevronForward, home } from "ionicons/icons";

interface ContainerProps {
    /** Additional classes to apply to the breadcrumbs */
    className?: string;
    /**
     * Path to the directory.
     *
     * Use `.` to specify the root directory.
     */
    path: string;
}

const DirectoryBreadcrumbs: React.FC<ContainerProps> = (props) => {
    const breadcrumbPaths = [""].concat(props.path.split("/").filter((p) => p !== "."));

    return (
        <IonBreadcrumbs className={props.className} maxItems={6} itemsBeforeCollapse={3} itemsAfterCollapse={3}>
            {breadcrumbPaths.map((fragment, idx) => {
                const routerLink = idx === 0 ? "/files/" : `/files/${breadcrumbPaths.slice(1, idx + 1).join("/")}`;
                return (
                    <IonBreadcrumb key={idx} routerLink={routerLink} routerDirection="back">
                        {idx === 0 ? (
                            <IonIcon slot="" icon={home} />
                        ) : (
                            <span className="max-w-64 truncate">{fragment}</span>
                        )}
                        <IonIcon slot="separator" icon={chevronForward} />
                    </IonBreadcrumb>
                );
            })}
        </IonBreadcrumbs>
    );
};

export default DirectoryBreadcrumbs;
