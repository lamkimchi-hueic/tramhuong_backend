const jwt = require('jsonwebtoken');

const token = jwt.sign(
    {
        id_user: 1,
        username: 'admin_test',
        role: 'Admin'
    },
    'your_super_secret_jwt_key_change_this_in_production',
    { expiresIn: '1h' }
);

async function testUpdate() {
    try {
        const response = await fetch('http://https://tramhuong-backend.onrender.com/api/users/abc', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone: "0123456789"
            })
        });

        const data = await response.json();
        console.log("Status code:", response.status);
        console.log("Response:", data);
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

testUpdate();
