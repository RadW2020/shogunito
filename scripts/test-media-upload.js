
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api/v1';
const AUTH = { email: 'admin@example.com', password: 'Password123!' };

async function testMediaUpload() {
    console.log('🚀 TESTING MEDIA UPLOAD AND THUMBNAIL GENERATION 🚀');
    
    try {
        // 1. Authenticate
        console.log('\n[1/4] Authenticating...');
        const authRes = await axios.post(`${API_URL}/auth/login`, AUTH);
        const token = authRes.data.data.tokens.accessToken;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        console.log('✅ Authenticated.');

        // 2. Setup
        console.log('\n[2/4] Setting up test sequence...');
        const projRes = await axios.post(`${API_URL}/projects`, {
            name: 'Media Test Project',
            code: `MT_${Date.now()}`
        }, config);
        const projectId = projRes.data.data.id;

        const epRes = await axios.post(`${API_URL}/episodes`, {
            name: 'Media Test Episode',
            code: `EP_MT_${Date.now()}`,
            projectId,
            cutOrder: 1
        }, config);
        const episodeId = epRes.data.data.id;

        const seqRes = await axios.post(`${API_URL}/sequences`, {
            name: 'Media Test Sequence',
            code: `SQ_MT_${Date.now()}`,
            episodeId,
            cutOrder: 1
        }, config);
        const sequenceId = seqRes.data.data.id;

        const vRes = await axios.post(`${API_URL}/versions`, {
            entityId: sequenceId,
            entityType: 'sequence',
            code: `V_MT_${Date.now()}`,
            name: 'Media Test Version',
            latest: true
        }, config);
        const versionId = vRes.data.data.id;
        console.log(`✅ Version created: ${vRes.data.data.code} (ID: ${versionId})`);

        // 3. Generate and Upload Image
        console.log('\n[3/4] Generating and uploading test image...');
        
        // Create a 640x360 blue PNG with some text
        const imageBuffer = await sharp({
            create: {
                width: 640,
                height: 360,
                channels: 4,
                background: { r: 0, g: 0, b: 255, alpha: 1 }
            }
        })
        .png()
        .toBuffer();

        const formData = new FormData();
        formData.append('file', imageBuffer, {
            filename: 'test-image.png',
            contentType: 'image/png',
        });

        const uploadRes = await axios.post(
            `${API_URL}/versions/${versionId}/file`,
            formData,
            {
                ...config,
                headers: {
                    ...config.headers,
                    ...formData.getHeaders(),
                },
            }
        );

        const updatedVersion = uploadRes.data.data;
        console.log('✅ Image uploaded successfully!');
        console.log('Final File Path:', updatedVersion.filePath);
        console.log('Final Thumbnail Path:', updatedVersion.thumbnailPath);

        // 4. Verify Accessibility
        console.log('\n[4/4] Verifying URL accessibility...');
        
        if (updatedVersion.filePath && updatedVersion.filePath.startsWith('http')) {
            try {
                const fileCheck = await axios.head(updatedVersion.filePath);
                console.log(`✅ File URL is accessible (Status: ${fileCheck.status})`);
            } catch (e) {
                console.error(`❌ File URL is NOT accessible: ${updatedVersion.filePath}`);
            }
        }

        if (updatedVersion.thumbnailPath && updatedVersion.thumbnailPath.startsWith('http')) {
            try {
                const thumbCheck = await axios.head(updatedVersion.thumbnailPath);
                console.log(`✅ Thumbnail URL is accessible (Status: ${thumbCheck.status})`);
            } catch (e) {
                console.error(`❌ Thumbnail URL is NOT accessible: ${updatedVersion.thumbnailPath}`);
                console.log('Check if MINIO_PUBLIC_ENDPOINT is correct and reachable.');
            }
        }

        console.log('\n🎉 MEDIA TEST COMPLETED 🎉');

    } catch (err) {
        console.error('\n❌ TEST FAILED');
        if (err.response) {
            console.error(`Status: ${err.response.status}`);
            console.error(`Data:`, JSON.stringify(err.response.data, null, 2));
        } else {
            console.error(err.message);
        }
        process.exit(1);
    }
}

testMediaUpload();
