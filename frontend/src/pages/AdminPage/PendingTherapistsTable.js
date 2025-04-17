// src/pages/AdminPage/PendingTherapistsTable.jsx
import React from "react";

const PendingTherapistsTable = ({ users, onView }) => (
  <table className="pending-table">
    <thead>
      <tr>
        <th>S.N.</th>
        <th>Name</th>
        <th>Email</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      {users.length > 0 ? (
        users.map((u, i) => (
          <tr key={u.id}>
            <td>{i + 1}</td>
            <td>{`${u.first_name} ${u.last_name}`}</td>
            <td>{u.username}</td>
            <td>
              <button
                className="view-button"
                onClick={() => onView(u.id)}
              >
                View
              </button>
            </td>
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan="4">No pending therapists found</td>
        </tr>
      )}
    </tbody>
  </table>
);

export default PendingTherapistsTable;
