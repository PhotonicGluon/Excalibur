import { useEffect, useRef } from "react";

import { useColorMode } from "@docusaurus/theme-common";

const WaveBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { colorMode } = useColorMode();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        let animationFrameId: number;
        let time = 0;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const particleConfig = {
            rows: 25,
            cols: 50,
            spacing: 40,
            amplitude: 20,
            frequency: 0.08,
            speed: 0.02,
            baseRadius: 1.5,
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const gridWidth = particleConfig.cols * particleConfig.spacing;
            const gridHeight = particleConfig.rows * particleConfig.spacing;
            const startX = (canvas.width - gridWidth) / 2;
            const startY = (canvas.height - gridHeight) / 2;

            const particleColor = colorMode === "dark" ? "rgba(96, 165, 250, 1)" : "rgba(0, 0, 0, 1)";
            ctx.fillStyle = particleColor;

            for (let i = 0; i < particleConfig.rows; i++) {
                for (let j = 0; j < particleConfig.cols; j++) {
                    const x = startX + j * particleConfig.spacing;
                    const yOffset = Math.sin(j * particleConfig.frequency + time) * particleConfig.amplitude;
                    const y = startY + i * particleConfig.spacing + yOffset;

                    const opacityFactor = 0.5 + (Math.sin(j * particleConfig.frequency * 0.7 + time) + 1) / 4;
                    const radius = particleConfig.baseRadius * opacityFactor;

                    ctx.globalAlpha = opacityFactor;
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1.0;
        };

        const animate = () => {
            time += particleConfig.speed;
            draw();
            animationFrameId = requestAnimationFrame(animate);
        };

        resizeCanvas();
        animate();

        window.addEventListener("resize", resizeCanvas);
        return () => {
            window.removeEventListener("resize", resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, [colorMode]);

    return <canvas ref={canvasRef} className="absolute inset-0 -z-10 bg-gray-50 dark:bg-gray-900" />;
};

export default WaveBackground;
