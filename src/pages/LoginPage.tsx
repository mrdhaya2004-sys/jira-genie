import React from 'react';
import LoginForm from '@/components/auth/LoginForm';
import { Helmet } from 'react-helmet-async';

const LoginPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Sign In — Test Zone</title>
        <meta name="description" content="Sign in to Test Zone, your AI-powered Jira ticket creation assistant for IT Cloud teams." />
        <link rel="canonical" href="https://www.testzoneai.com/auth/login" />
        <meta property="og:title" content="Sign In — Test Zone" />
        <meta property="og:description" content="Sign in to Test Zone, your AI-powered Jira ticket creation assistant for IT Cloud teams." />
        <meta property="og:url" content="https://www.testzoneai.com/auth/login" />
      </Helmet>
      <LoginForm />
    </>
  );
};

export default LoginPage;
