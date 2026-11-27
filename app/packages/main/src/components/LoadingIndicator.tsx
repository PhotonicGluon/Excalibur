import { IonLoading } from "@ionic/react";

interface ContainerProps {
    /** Whether the loading indicator is shown */
    isShown: boolean;
    /** Message to display */
    message: string;
}

const LoadingIndicator: React.FC<ContainerProps> = (props) => {
    return (
        <IonLoading
            className="[&_.loading-wrapper]:w-full [&_.loading-wrapper_.loading-content]:w-full"
            isOpen={props.isShown}
            message={props.message}
        ></IonLoading>
    );
};

export default LoadingIndicator;
