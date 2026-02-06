import React from 'react'

const RegisterPage:React.FC = () => {
  return (
    <div>
        <h1>This is RegisterPage</h1>

        <label>
            Enter your ID: <input name='ID'></input>
        </label>
        <hr></hr>
        <label>
            Enter your Password:  <input name='Password'></input>
        </label>
    </div>
  )
}

export default RegisterPage