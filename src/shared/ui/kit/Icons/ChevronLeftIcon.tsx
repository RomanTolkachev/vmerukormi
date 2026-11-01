import React from "react";

export const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
	<svg
		width="100%"
		height="100%"
		viewBox="0 0 23 24"
		fill="none"
		stroke="currentColor"
		strokeWidth={2}
		strokeLinecap="round"
		strokeLinejoin="round"
		style={{ transform: "rotate(90deg)" }}
		xmlns="http://www.w3.org/2000/svg"
		{...props}>
		<path d="m6 9 6 6 6-6" />
	</svg>
);

export default ChevronLeftIcon;

