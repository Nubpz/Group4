import React from "react";

const RecentTable = ({ users }) => (
  <table className="recent-table">
    <thead>
      <tr>
        <th>S.N.</th>
        <th>First Name</th>
        <th>Last Name</th>
        <th>Email</th>
        <th>Created At</th>
      </tr>
    </thead>
    <tbody>
      {users.length>0 ? (
        users.map((u,i)=>(
          <tr key={u.id}>
            <td>{i+1}</td>
            <td>{u.first_name}</td>
            <td>{u.last_name}</td>
            <td>{u.username}</td>
            <td>{new Date(u.created_at).toLocaleString()}</td>
          </tr>
        ))
      ) : (
        <tr><td colSpan="5">No recent registrations</td></tr>
      )}
    </tbody>
  </table>
);

export default RecentTable;
