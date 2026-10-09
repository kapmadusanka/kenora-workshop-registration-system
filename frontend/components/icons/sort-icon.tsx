import React from "react";

const SortIcon = (props: React.SVGProps<SVGSVGElement>) => {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path
                d="M2.5 3.75H8.125M2.5 7.5H6.875M2.5 11.25H6.875M9.375 9.375L11.25 11.25M11.25 11.25L13.125 9.375M11.25 11.25V3.75"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default SortIcon;

