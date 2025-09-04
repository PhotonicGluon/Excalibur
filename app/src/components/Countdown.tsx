import React, { HTMLAttributes, useEffect, useState } from "react";

import { IonLabel, IonText } from "@ionic/react";

import { padNumber } from "@lib/util";

interface CountdownProps extends HTMLAttributes<HTMLIonLabelElement> {
    /** Countdown ending date */
    endDate: Date;
    /** Callback to be called when the countdown expires */
    onExpiry: () => void;
}

const Countdown: React.FC<CountdownProps> = ({ endDate: date, onExpiry, ...props }) => {
    const [time, setTime] = useState({
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

            setTime({ hours, minutes, seconds });

            if (interval && hours <= 0 && minutes <= 0 && seconds <= 0) {
                clearInterval(interval);
                onExpiry();
            }
        }

        const interval = setInterval(tick, 1000);
        tick();

        return () => clearInterval(interval);
    }, [date, onExpiry]);

    return (
        <IonLabel {...props}>
            <IonText className="pl-1">
                {`${padNumber(time.hours, 2)}:${padNumber(time.minutes, 2)}:${padNumber(time.seconds, 2)}`}
            </IonText>
        </IonLabel>
    );
};

export default Countdown;
