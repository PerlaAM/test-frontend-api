import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons";

export default function ErrorValidation({ message, touched }: any) {
    return (
        <p
            className={`m-0 text-red-800 text-xs font-light mt-2 ${
                message && touched ? "" : "d-none"
            }`}>
            {message && touched && (
                <>
                    <FontAwesomeIcon
                        icon={faCircleExclamation}
                        className="me-1"
                    />
                    {message}
                </>
            )}
        </p>
    );
}
