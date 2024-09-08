<?php

function Media_livestreamAuth_response_content($params)
{
    //Q_Response::addScript('{{Media}}/js/pages/meeting.js');

    $code = $_GET['code'];
    if ($_SERVER['HTTP_REFERER'] == 'https://accounts.google.com/') {

        $client_id = Q_Config::expect('Media', 'livestream', 'auth', 'google', 'clientId');
        $client_secret = Q_Config::expect('Media', 'livestream', 'auth', 'google', 'secret');
        $redirect_uri = 'https://' . $_SERVER['SERVER_NAME'] . '/livestreamAuth';

        // The authorization code you received from Google
        $auth_code = $_GET['code'];

        // The token endpoint URL
        $token_url = 'https://oauth2.googleapis.com/token';

        // Prepare the token request
        $data = array(
            'code' => $auth_code,
            'client_id' => $client_id,
            'client_secret' => $client_secret,
            'redirect_uri' => $redirect_uri,
            'grant_type' => 'authorization_code',
        );

        // Initialize a cURL session
        $ch = curl_init();

        // Set the cURL options
        curl_setopt($ch, CURLOPT_URL, $token_url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        // Execute the cURL request and get the response
        $response = curl_exec($ch);

        // Check for errors
        if (curl_errno($ch)) {
            echo 'Error:' . curl_error($ch);
            exit();
        }

        // Close the cURL session
        curl_close($ch);

        // Decode the response
        $response_data = json_decode($response, true);

        // Get the access token and refresh token
        $access_token = $response_data['access_token'];
        $access_token_expires = $response_data['expires_in'];
        $refresh_token = $response_data['refresh_token'];

        $_SESSION["media_google_refresh_token"] = $refresh_token;
        $api_url = "https://www.googleapis.com/youtube/v3/channels?part=id,snippet,contentDetails,statistics&mine=true";

        // Initialize a cURL session
        $ch = curl_init();

        // Set the cURL options
        curl_setopt($ch, CURLOPT_URL, $api_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer $access_token",
            "Accept: application/json"
        ]);

        // Execute the cURL request and get the response
        $response = curl_exec($ch);

        // Check for errors
        if (curl_errno($ch)) {
            echo 'Error:' . curl_error($ch);
            exit();
        }

        // Close the cURL session
        curl_close($ch);

        // Decode the response
        $response_data = json_decode($response, true);
        $channel = $response_data['items'][0];
        $channelId = $channel['id'];
        $channelTitle = $channel['snippet']['title'];
        $channelDesc = $channel['snippet']['description'];
        $channelCustomUrl = $channel['snippet']['customUrl'];
        $channelThumbnail = $channel['snippet']['thumbnails']['default']['url'];

        $script = <<<EOF
                    let dataToSave = {
                        destId: Date.now().toString(10) + Math.random().toString(10).replace(/\./g, ""),
                        type: 'youtube',
                        channelId: '$channelId',
                        channelTitle: '$channelTitle',
                        channelDesc: '$channelDesc',
                        customUrl: '$channelCustomUrl',
                        thumbnail: '$channelThumbnail',
                        accessToken: '$access_token',
                        accessTokenExpiresIn: $access_token_expires,
                        updatedAt: Date.now(),
                        createdAt: Date.now(),
                        streamTitle: 'Streaming with Qbix',
                        streamDesc: 'Streaming with Qbix'
                    }

                    let existingTokens = localStorage.getItem('q_google_webrtc_access_tokens');
                    console.log('existingTokens 0', existingTokens)
                    if(existingTokens) {
                        storageItems = JSON.parse(existingTokens);
                    } else {
                        storageItems = [];
                    }

                    console.log('existingTokens', storageItems)

                    let alreadyExist = false;
                    for(let i in storageItems) {
                        if(storageItems[i].channelId == dataToSave.channelId) {
                            let createdAt = storageItems[i].createdAt;
                            storageItems[i].channelTitle = dataToSave.channelTitle;
                            storageItems[i].channelDesc = dataToSave.channelDesc;
                            storageItems[i].accessToken = dataToSave.accessToken;
                            storageItems[i].accessTokenExpiresIn = dataToSave.accessTokenExpiresIn;
                            storageItems[i].destId = storageItems[i].destId;
                            storageItems[i].createdAt = createdAt;
                            alreadyExist = true;
                            break;
                        }
                    }
                    if(!alreadyExist) {
                        storageItems.push(dataToSave);
                    }
                    localStorage.setItem('q_google_webrtc_access_tokens', JSON.stringify(storageItems));

                    window.close();
                
            
    EOF;
                
                    Q_Response::addScriptLine("
                    $script", '@end');
                

               
            
    } else {
        $apps = Q_Config::get('Users', 'apps', 'facebook', array());

        $communityId = Users::communityId();

        foreach ($apps as $k => $v) {
            if ($k === $communityId) {
                $appId = $v['appId'];
                $appSecret = $v['secret'];
                break;
            }
        }

        if (isset($appId) && isset($appSecret)) {
            $code = $_GET['code'];
            $redirectUri = 'https://' . $_SERVER['SERVER_NAME'] . '/livestreamAuth';

            // Exchange the code for an access token
            $tokenUrl = "https://graph.facebook.com/v11.0/oauth/access_token?client_id={$appId}&redirect_uri=" . urlencode($redirectUri) . "&client_secret={$appSecret}&code={$code}";

            $response = file_get_contents($tokenUrl);
            $data = json_decode($response, true);
            if (isset($data['access_token'])) {
                $accessToken = $data['access_token'];
                $expiresIn = $data['expires_in'];
                // Use the access token to make API calls on behalf of the user
                // Example: Fetch user profile data
                $profileUrl = "https://graph.facebook.com/me?access_token={$accessToken}&fields=id,name,email";
                $profileResponse = file_get_contents($profileUrl);
                $profileData = json_decode($profileResponse, true);
                $channelName = $profileData['name'];
                $id = $profileData['id'];

                $script = <<<EOD
                let dataToSave = {
                    destId: Date.now().toString(10) + Math.random().toString(10).replace(/\./g, ""),
                    type: 'facebook',
                    channelTitle: '$channelName',
                    profileId: '$id',
                    accessToken: "$accessToken",
                    accessTokenExpiresIn: $expiresIn,
                    updatedAt: Date.now(),
                    createdAt: Date.now(),
                    streamTitle: 'Streaming with Qbix',
                    streamDesc: 'Streaming with Qbix'
                }
    
                let existingTokens = localStorage.getItem('q_google_webrtc_access_tokens');
                console.log('existingTokens 0', existingTokens)
                if(existingTokens) {
                    storageItems = JSON.parse(existingTokens);
                } else {
                    storageItems = [];
                }
    
                console.log('existingToken534345s', storageItems)
    
                let alreadyExist = false;
                for(let i in storageItems) {
                    if(storageItems[i].profileId == dataToSave.profileId) {
                        let createdAt = storageItems[i].createdAt;
                        storageItems[i].channelTitle = dataToSave.channelTitle;
                        storageItems[i].accessToken = dataToSave.accessToken;
                        storageItems[i].accessTokenExpiresIn = dataToSave.accessTokenExpiresIn;
                        storageItems[i].destId = storageItems[i].destId;
                        storageItems[i].createdAt = createdAt;
                        alreadyExist = true;
                        break;
                    }
                }
                if(!alreadyExist) {
                    storageItems.push(dataToSave);
                }
                localStorage.setItem('q_google_webrtc_access_tokens', JSON.stringify(storageItems));
                window.close();
                EOD;
                if (isset($data['access_token'])) {
                    $accessToken = $data['access_token'];
                    Q_Response::addScriptLine("
                    $script", '@end');
                }

               
            }
        }            
        
        
    }

    return Q::view("Media/content/meeting.php");
}
