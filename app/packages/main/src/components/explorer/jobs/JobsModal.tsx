import { IonTitle } from "@ionic/react";

import Modal from "@components/Modal";
import JobsList from "@components/explorer/jobs/JobsList";
import { useJobsManager } from "@components/explorer/jobs/context";
import { useEffect } from "react";

interface ContainerProps {
    /** Whether the modal is shown */
    isShown: boolean;
    /** Function to set the modal shown state */
    setIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}

const JobsModal: React.FC<ContainerProps> = ({ isShown, setIsShown }) => {
    // Contexts
    const jobsManager = useJobsManager();

    // Effects
    useEffect(() => {
        // Make modal pop up if there are jobs
        if (jobsManager.jobs.size > 0) {
            setIsShown(true);
        }
    }, [jobsManager.jobs.size, setIsShown]);

    // Render
    return (
        <Modal
            isShown={isShown}
            setIsShown={setIsShown}
            header={
                <IonTitle>
                    {jobsManager.jobs.size > 0 ? (
                        <span>
                            {jobsManager.jobs.size} Job{jobsManager.jobs.size === 1 ? "" : "s"}
                        </span>
                    ) : (
                        <span>No Jobs</span>
                    )}
                </IonTitle>
            }
        >
            <JobsList />
        </Modal>
    );
};

export default JobsModal;
