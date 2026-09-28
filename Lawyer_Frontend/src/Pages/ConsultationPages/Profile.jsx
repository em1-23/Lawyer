import React from 'react'

function Profile(lawyer) {
  return (
    <div className="Profile">
      {lawyer.image && <img src={lawyer.image} alt={lawyer.name} />}
      <h6>{lawyer.name}</h6>
    </div>
  )
}

export default Profile