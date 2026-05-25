import { useRef, useState } from "react";

import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonToolbar } from "@ionic/react";
import { chevronDown, chevronUp, close } from "ionicons/icons";

import { sleep } from "@lib/util";

interface ContainerProps {
    /** ID for the modal trigger */
    trigger: string;
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
    const Header = (
        <IonHeader ref={headerRef}>
            <IonToolbar>
                {props.header}
                <IonButtons slot="end">
                    <IonButton onClick={() => modalRef.current?.dismiss()}>
                        <IonIcon slot="icon-only" icon={close} />
                    </IonButton>
                    <IonButton onClick={toggleExpand}>
                        <IonIcon slot="icon-only" icon={isFull ? chevronDown : chevronUp} />
                    </IonButton>
                </IonButtons>
            </IonToolbar>
        </IonHeader>
    );
    return (
        <IonModal
            ref={modalRef}
            trigger={props.trigger}
            handle={false}
            initialBreakpoint={initialBreakpoint}
            breakpoints={[initialBreakpoint, 1]}
            backdropDismiss={false}
            onDidPresent={async () => {
                const initialBreakpointValue = headerRef.current?.offsetHeight
                    ? headerRef.current?.offsetHeight / window.innerHeight
                    : 0.5; // Seems like a safe default to have
                setInitialBreakpoint(initialBreakpointValue);
                await sleep(1); // Allow value change to propagate
                modalRef.current?.setCurrentBreakpoint(initialBreakpointValue);
            }}
            onDidDismiss={() => setIsFull(false)}
        >
            {Header}
            <IonContent className="ion-padding">{props.children}</IonContent>
        </IonModal>
    );
};

export default Modal;
