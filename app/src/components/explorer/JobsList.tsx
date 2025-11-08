import { IonContent } from "@ionic/react";

import JobEntry, { Job } from "./JobEntry";

interface ContainerProps {
    jobs: Map<string, Job>;
}

// TODO: Add tests
const JobsList: React.FC<ContainerProps> = (props) => {
    return (
        <IonContent className="ion-padding rounded-lg">
            {props.jobs.size > 0 ? (
                <div className="flex flex-col gap-2">
                    {Array.from(props.jobs.entries()).map(([jobId, job]) => (
                        <JobEntry key={jobId} {...job} />
                    ))}
                </div>
            ) : (
                <span className="block w-full text-center">No jobs</span>
            )}
        </IonContent>
    );
};

export default JobsList;
