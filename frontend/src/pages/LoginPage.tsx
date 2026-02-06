import React from 'react'

const LoginPage: React.FC = () => {
  return (
    <div>
        <h1>This is LoginPage</h1>
        <label>
            ID: <input name='ID'></input>
        </label>
        <hr></hr>
        <label>
            Password:  <input name='Password'></input>
        </label>
        <hr></hr>
        <button>
            Login
        </button>
        

       
    </div>
  )
}

export default LoginPage