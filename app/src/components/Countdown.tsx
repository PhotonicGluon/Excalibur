import React, { HTMLAttributes, useEffect, useState } from "react";

import { IonLabel, IonText } from "@ionic/react";

import { padNumber } from "@lib/util";

interface CountdownProps {
    /** Countdown ending date */
    date: Date;
    /** Callback to be called when the countdown expires */
    onExpiry: () => void;
}

const Countdown: React.FC<CountdownProps & HTMLAttributes<HTMLIonLabelElement>> = ({ date, onExpiry, ...props }) => {
    const [state, setState] = useState({
        hours: 0,
        minutes: 0,
        seconds: 0,
    });

    useEffect(() => {
        let interval: NodeJS.Timeout;
        function tick() {
            const now = new Date();
            const timeDifference = date.getTime() - now.getTime();

            const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

            setState({ hours, minutes, seconds });

            if (interval && hours === 0 && minutes === 0 && seconds === 0) {
                clearInterval(interval);
                onExpiry();
            }
        }

        interval = setInterval(tick, 1000);
        tick();

        return () => clearInterval(interval);
    }, [date]);

    return (
        <IonLabel {...props}>
            <IonText className="pl-1">{`${padNumber(state.hours, 2)}:${padNumber(state.minutes, 2)}:${padNumber(state.seconds, 2)}`}</IonText>
        </IonLabel>
    );
};

export default Countdown;
