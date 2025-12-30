import React, { useState } from 'react';

const CREDENTIALS = {
  dhanush: 'dhanush1',
  vijay: 'vijay1',
  sandeep: 'sandeep1',
  naveen: 'naveen1',
  praneeth: 'praneeth1',
};

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const expected = CREDENTIALS[username];
    if (!expected) {
      setError('Unknown user');
      return;
    }
    if (expected !== password) {
      setError('Incorrect password');
      return;
    }

    // success
    localStorage.setItem('authUser', username);
    setError('');
    onLogin(username);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white p-6 rounded-xl shadow">
        <h2 className="text-2xl font-semibold mb-4">Sign in</h2>
        <label className="block text-sm text-gray-600 mb-1">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-3 px-3 py-2 border border-gray-300 rounded"
          placeholder="name"
          autoFocus
        />

        <label className="block text-sm text-gray-600 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-3 px-3 py-2 border border-gray-300 rounded"
          placeholder="password"
        />

        {error && <div className="text-sm text-red-500 mb-3">{error}</div>}

        <div className="flex gap-2">
          <button type="submit" className="flex-1 bg-green-600 text-white px-4 py-2 rounded">Sign in</button>
          <button
            type="button"
            onClick={() => {
              setUsername('');
              setPassword('');
              setError('');
            }}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded"
          >
            Reset
          </button>
        </div>

        {/* <p className="mt-4 text-xs text-gray-500">Use static creds: dhanush/dhanush1 or vijay/vijay1</p> */}
      </form>
    </div>
  );
};

export default Login;
