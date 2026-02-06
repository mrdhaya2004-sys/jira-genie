import React from 'react';

interface TeamsIconProps {
  className?: string;
}

const TeamsIcon: React.FC<TeamsIconProps> = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.625 6.75H17.25V4.5C17.25 3.672 16.578 3 15.75 3H8.25C7.422 3 6.75 3.672 6.75 4.5V6.75H3.375C2.754 6.75 2.25 7.254 2.25 7.875V18.375C2.25 18.996 2.754 19.5 3.375 19.5H9V17.25H4.5V9H19.5V17.25H15V19.5H20.625C21.246 19.5 21.75 18.996 21.75 18.375V7.875C21.75 7.254 21.246 6.75 20.625 6.75ZM15 6.75H9V5.25H15V6.75Z" fill="#5B5FC7"/>
    <path d="M12 11.25C11.172 11.25 10.5 11.922 10.5 12.75V16.5C10.5 17.328 11.172 18 12 18C12.828 18 13.5 17.328 13.5 16.5V12.75C13.5 11.922 12.828 11.25 12 11.25Z" fill="#5B5FC7"/>
    <circle cx="18.75" cy="4.5" r="2.25" fill="#5B5FC7" opacity="0.7"/>
  </svg>
);

export default TeamsIcon;
