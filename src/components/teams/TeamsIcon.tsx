import React from 'react';
import teamsLogo from '@/assets/teams-logo.png';

interface TeamsIconProps {
  className?: string;
}

const TeamsIcon: React.FC<TeamsIconProps> = ({ className = 'h-5 w-5' }) => (
  <img src={teamsLogo} alt="Microsoft Teams" className={className} />
);

export default TeamsIcon;
