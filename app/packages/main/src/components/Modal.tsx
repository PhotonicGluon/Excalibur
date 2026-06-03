import { useRef, useState } from "react";

import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonToolbar } from "@ionic/react";
import { chevronDown, chevronUp, close } from "ionicons/icons";

import { sleep } from "@lib/util";

interface ContainerProps {
    /** Whether the modal is shown */
    isShown: boolean;
    /** Function to set the modal shown state */
    setIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    /** Function to call when the modal is closed */
    onClose?: () => void;
    /** Header content for the modal */
    header?: React.ReactNode;
    /** Content to display within the modal */
    children: React.ReactNode;
}

const Modal: React.FC<ContainerProps> = (props) => {
    // States
    const [initialBreakpoint, setInitialBreakpoint] = useState(0);
    const [isFull, setIsFull] = useState(false);

    // References
    const modalRef = useRef<HTMLIonModalElement>(null);
    const headerRef = useRef<HTMLIonHeaderElement>(null);

    // Functions
    function toggleExpand() {
        modalRef.current?.setCurrentBreakpoint(isFull ? initialBreakpoint : 1);
        setIsFull(!isFull);
    }

    // Render
    return (
        <IonModal
            ref={modalRef}
            className="[--max-width:--spacing(180)] [--width:100vw]"
            isOpen={props.isShown}
            handle={false}
            initialBreakpoint={initialBreakpoint}
            breakpoints={[initialBreakpoint, 1]}
            backdropBreakpoint={0.5}
            backdropDismiss={false}
            onDidPresent={async () => {
                const initialBreakpointValue = headerRef.current?.offsetHeight
                    ? headerRef.current?.offsetHeight / window.innerHeight
                    : 0.5; // Seems like a safe default to have
                setInitialBreakpoint(initialBreakpointValue);
                await sleep(1); // Allow value change to propagate
                modalRef.current?.setCurrentBreakpoint(initialBreakpointValue);
            }}
            onDidDismiss={() => {
                setIsFull(false);
                props.setIsShown(false);
                props.onClose?.();
            }}
        >
            <IonHeader ref={headerRef}>
                <IonToolbar>
                    {props.header}
                    <IonButtons slot="end">
                        <IonButton onClick={() => props.setIsShown(false)} aria-label="Close modal">
                            <IonIcon slot="icon-only" icon={close} />
                        </IonButton>
                        <IonButton onClick={toggleExpand} aria-label={isFull ? "Collapse modal" : "Expand modal"}>
                            <IonIcon slot="icon-only" icon={isFull ? chevronDown : chevronUp} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">{isFull && props.children}</IonContent>
        </IonModal>
    );
};

export default Modal;
