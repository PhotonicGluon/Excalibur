import "./ExploreContainer.css";

interface ContainerProps {}

const ExploreContainer: React.FC<ContainerProps> = () => {
    return (
        <div className="absolute top-1/2 right-0 left-0 -translate-y-1/2 text-center">
            <strong className="text-2xl font-bold">Ready to create an app?</strong>
            <p className="m-0 text-base text-gray-400">
                Start with Ionic{" "}
                <a
                    className="no-underline"
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://ionicframework.com/docs/components"
                >
                    UI Components
                </a>
            </p>
        </div>
    );
};

export default ExploreContainer;
