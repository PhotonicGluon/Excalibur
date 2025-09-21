import Link from "@docusaurus/Link";

interface GoToDocsButtonProps {
    text: string;
}

const GoToDocsButton: React.FC<GoToDocsButtonProps> = ({ text }) => {
    return (
        <Link
            className="transform-all rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-8 py-4 text-lg font-bold !text-white !no-underline shadow-lg transition-transform duration-300 hover:from-purple-600 hover:to-blue-600"
            to="/docs"
        >
            {text}
        </Link>
    );
};

export default GoToDocsButton;
