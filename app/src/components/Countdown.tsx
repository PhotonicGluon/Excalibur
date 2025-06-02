import React, { HTMLAttributes, useEffect, useState } from "react";

import { IonIcon, IonLabel, IonText } from "@ionic/react";
import { timeOutline } from "ionicons/icons";

import { padNumber } from "@lib/util";

interface CountdownProps {
    /** Countdown ending date */
    date: Date;
}

const Countdown: React.FC<CountdownProps & HTMLAttributes<HTMLIonLabelElement>> = ({ date, ...props }) => {
    const [state, setState] = useState({
        hours: 0,
        minutes: 0,
        seconds: 0,
    });

    useEffect(() => {
        function tick() {
            const now = new Date();
            const timeDifference = date.getTime() - now.getTime();

            const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

            setState({ hours, minutes, seconds });
        }
        const interval = setInterval(tick, 1000);
        tick();

        return () => clearInterval(interval);
    }, [date]);

    return (
        <IonLabel {...props}>
            <div className="flex">
                <IonIcon icon={timeOutline} size="small"></IonIcon>
                <IonText className="pl-1">{`${padNumber(state.hours, 2)}:${padNumber(state.minutes, 2)}:${padNumber(state.seconds, 2)}`}</IonText>
            </div>
        </IonLabel>
    );
};

export default Countdown;
