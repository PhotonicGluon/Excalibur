import { useCallback, useEffect } from "react";

import { IonTitle } from "@ionic/react";

import Modal from "@components/Modal";
import JobsList from "@components/explorer/jobs/JobsList";
import { useJobsManager } from "@components/explorer/jobs/context";

interface ContainerProps {
    /** Whether the modal is shown */
    isShown: boolean;
    /** Function to set the modal shown state */
    setIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}

const JobsModal: React.FC<ContainerProps> = ({ isShown, setIsShown }) => {
    // Contexts
    const jobsManager = useJobsManager();

    // Functions
    /**
     * Nicely formats the jobs count for display in the modal header.
     *
     * @returns the formatted jobs count
     */
    const formatJobsCount = useCallback(() => {
        const total = jobsManager.jobs.size;
        if (total === 0) {
            return "No Jobs";
        }

        const progresses = Array.from(jobsManager.jobs.values()).map((job) => job.progress);
        const completed = progresses.filter((progress) => progress === true).length;
        const failed = progresses.filter((progress) => progress === false).length;
        const pending = total - completed - failed;

        const pieces = [];
        if (pending > 0) {
            pieces.push(`${pending} Pending`);
        }
        if (completed > 0) {
            pieces.push(`${completed} Done`);
        }
        if (failed > 0) {
            pieces.push(`${failed} Failed`);
        }

        return pieces.join(", ");
    }, [jobsManager.jobs]);

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
            onClose={() => jobsManager.clearComplete()}
            header={<IonTitle>{formatJobsCount()}</IonTitle>}
        >
            <JobsList />
        </Modal>
    );
};

export default JobsModal;
