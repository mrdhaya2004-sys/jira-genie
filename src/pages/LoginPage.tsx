import React from 'react';
import LoginForm from '@/components/auth/LoginForm';
import { Helmet } from 'react-helmet-async';

const LoginPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Sign In - TicketBot</title>
        <meta name="description" content="Sign in to TicketBot, your AI-powered Jira ticket creation assistant." />
      </Helmet>
      <LoginForm />
    </>
  );
};

export default LoginPage;
