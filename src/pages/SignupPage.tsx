import React from 'react';
import SignupForm from '@/components/auth/SignupForm';
import { Helmet } from 'react-helmet-async';

const SignupPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Sign Up — Test Zone</title>
        <meta name="description" content="Create your Test Zone account to streamline IT ticket creation with AI-powered assistance." />
        <link rel="canonical" href="https://www.testzoneai.com/auth/signup" />
        <meta property="og:title" content="Sign Up — Test Zone" />
        <meta property="og:description" content="Create your Test Zone account to streamline IT ticket creation with AI-powered assistance." />
        <meta property="og:url" content="https://www.testzoneai.com/auth/signup" />
      </Helmet>
      <SignupForm />
    </>
  );
};

export default SignupPage;
