(function ($, window, undefined) {

    Q.Tool.define("Games/teams", function (options) {
        var tool = this;
        console.log('Games/teams START')
        tool.gameStream = null;
        tool.teams = [];
        tool.participants = [];
        tool.teamsListEl = null;
        tool.noTeamUsersList = null;

        tool.loadStyles().then(function () {
            tool.joinGameStream().then(function (participants) {
                console.log('joinGameStream: participants', participants)
                tool.getGameStreamInstance().then(function (stream) {
                    tool.gameStream = stream;
                    tool.declareEventHandlers();
                    tool.refreshTeams();
    
                    tool.getAllParticipants().then(function (participants) {
                        console.log('participants', participants)
                        for (let i in participants) {
                            tool.addNewParticipant(participants[i].fields);
                        }
                        tool.buildInterface();
                        tool.reloadTeamsAndUsersUI();
                    });
                })
            })
        });
    },

        {
            publisherId: null,
            streamName: null,
            onRefresh: new Q.Event()
        },

        {
            loadStyles: function () {
                return new Promise(function (resolve, reject) {
                    Q.addStylesheet('{{Media}}/css/tools/teams.css', function () {
                        resolve();
                    });
                });
            },
            joinGameStream: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/teams", ["joinGameStream"], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);

                        if (msg) {
                            Q.alert(msg);
                            reject(msg)
                            return;
                        }

                        resolve(response.slots.joinGameStream);
                    }, {
                        method: 'post',
                        fields: {
                            publisherId: tool.state.publisherId,
                            streamName: tool.state.streamName,
                        }
                    });
                });
            },
            getGameStreamInstance: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.Streams.get(tool.state.publisherId, tool.state.streamName, function (err, stream) {
                        if (!stream) {
                            console.error('Error while getting game stream', err);
                            reject('Error while getting game stream');
                            return;
                        }

                        resolve(stream);
                    });
                });
            },
            getAllParticipants: function () {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/teams", ["allParticipants"], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);

                        if (msg) {
                            Q.alert(msg);
                            reject(msg)
                            return;
                        }

                        resolve(response.slots.allParticipants);
                    }, {
                        method: 'get',
                        fields: {
                            publisherId: tool.state.publisherId,
                            streamName: tool.state.streamName,
                        }
                    });
                });
            },
            addNewParticipant: function (participant) {
                console.log('addNewParticipant', participant);
                var tool = this;
                let alreadyExists = false;
                for (let p = tool.participants.length - 1; p >= 0; p--) {
                    if (tool.participants[p].userId == participant.userId) {
                        alreadyExists = true;
                        break;
                    }
                }

                let extra = JSON.parse(participant.extra);
                if (!alreadyExists) {
                    let userItem = document.createElement('DIV');
                    userItem.className = 'teams-item-user-item';

                    let userAvatar = document.createElement('DIV');
                    userAvatar.className = 'user-item-avatar';
                    userItem.appendChild(userAvatar);

                   
                    Q.activate(
                        Q.Tool.setUpElement(
                            userAvatar,
                            "Users/avatar",
                            {
                                userId: participant.userId,
                                contents: true,
                                icon: 80
                            }
                        ),
                        {},
                        function () {
                            let avatarTool = this;
                        }
                    );

                    tool.participants.push({
                        userId: participant.userId,
                        teamId: extra.teamId,
                        currentTeamInstance: null,
                        userItemEl: userItem
                    });
                }
            },
            refreshTeams: function () {
                var tool = this;
                let teams = tool.gameStream.getAttribute('teams');
                console.log('refreshTeams: teams', teams)
                if (teams && Array.isArray(teams)) {
                    for (let t in teams) {
                        let teamExists = false;
                        for (let i = tool.teams.length - 1; i >= 0; i--) {
                            if(tool.teams[i].teamId == teams[t].id) {
                                teamExists = tool.teams[i];
                                break;
                            }
                        }

                        if(teamExists !== false) {
                            teamExists.name = teams[t].name; // refresh name if it was modified by user
                            continue;
                        }

                        tool.teams.push({
                            teamId: teams[t].id,
                            name: teams[t].name,
                            participants: []
                        })
                        
                    }
                    console.log('refreshTeams tool teams', tool.teams)
                }
            },
            declareEventHandlers: function () {
                var tool = this;
                tool.gameStream.onMessage("Games/teams/userJoined").set(function (message) {
                    console.log('Games/teams/userJoined', message)
                    var instructions = JSON.parse(message.instructions);

                    tool.addNewParticipant(instructions.participant);
                    tool.reloadTeamsAndUsersUI();
                }, tool);
                tool.gameStream.onMessage("Games/teams/userChangedTeam").set(function (message) {
                    console.log('Games/teams/userChangedTeam', message)
                    var instructions = JSON.parse(message.instructions);
                    for (let i = tool.participants.length - 1; i >= 0; i--) {
                        console.log('Games/teams/userChangedTeam 2', tool.participants[i].userId, instructions.userId)

                        if (tool.participants[i].userId == instructions.userId) {
                            tool.participants[i].teamId = instructions.teamId;
                            tool.reloadTeamsAndUsersUI();
                            break;
                        }
                    }
                }, tool);
                tool.gameStream.onMessage("Games/teams/newTeamAdded").set(function (message) {
                    console.log('Games/teams/newTeamAdded', message)
                    var instructions = JSON.parse(message.instructions);
                    tool.gameStream.refresh(function() {
                        tool.gameStream = this;
                        tool.refreshTeams();
                        tool.reloadTeamsAndUsersUI();
                    }, {evenIfNotRetained: true});
                }, tool);
                tool.gameStream.onMessage("Games/teams/teamNameChanged").set(function (message) {
                    console.log('Games/teams/teamNameChanged', message)
                    var instructions = JSON.parse(message.instructions);
                    tool.gameStream.refresh(function() {
                        tool.gameStream = this;
                        tool.refreshTeams();
                        tool.reloadTeamsAndUsersUI();
                    }, {evenIfNotRetained: true});
                }, tool);


            },
            switchTeam: function (teamId) {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/teams", ["switchTeam"], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);
    
                        if (msg) {
                            Q.alert(msg);
                            reject(msg)
                            return;
                        }
    
                        resolve(response.slots.switchTeam);
                    }, {
                        method: 'put',
                        fields: {
                            publisherId: tool.state.publisherId,
                            streamName: tool.state.streamName,
                            teamId: teamId
                        }
                    });
                });
            },
            addTeam: function (teamName) {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/teams", ["addTeam"], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);
    
                        if (msg) {
                            Q.alert(msg);
                            reject(msg)
                            return;
                        }
    
                        resolve(response.slots.addTeam);
                    }, {
                        method: 'post',
                        fields: {
                            publisherId: tool.state.publisherId,
                            streamName: tool.state.streamName,
                            teamName: teamName
                        }
                    });
                });
            },
            changeTeamName: function (teamId, newTeamName) {
                var tool = this;
                return new Promise(function (resolve, reject) {
                    Q.req("Media/teams", ["changeTeamName"], function (err, response) {
                        var msg = Q.firstErrorMessage(err, response && response.errors);
    
                        if (msg) {
                            Q.alert(msg);
                            reject(msg)
                            return;
                        }
    
                        resolve(response.slots.changeTeamName);
                    }, {
                        method: 'put',
                        fields: {
                            publisherId: tool.state.publisherId,
                            streamName: tool.state.streamName,
                            teamId: teamId,
                            newTeamName: newTeamName
                        }
                    });
                });
            },
            buildInterface: function () {
                var tool = this;
                let mainContainer = document.createElement('DIV');
                mainContainer.className = 'games-teams';
                tool.element.appendChild(mainContainer);

                let teamsList = tool.teamsListEl = document.createElement('DIV');
                teamsList.className = 'teams-list';
                mainContainer.appendChild(teamsList);

                let newTeamCon = document.createElement('DIV');
                newTeamCon.className = 'teams-create-con';
                mainContainer.appendChild(newTeamCon);

                let newTeam = document.createElement('BUTTON');
                newTeam.className = 'teams-create';
                newTeam.innerHTML = 'Add Team';
                newTeamCon.appendChild(newTeam);

                newTeam.addEventListener('click', function () {
                    Q.prompt(null, function (content) {
                        if (!content) {
                            return;
                        }
                        
                        tool.addTeam(content);                            
                    }, {
                        title: 'Enter name of the team',
                        noClose: false
                    });
                });

                let noneTeamUsers = document.createElement('fieldset');
                noneTeamUsers.className = 'teams-none-team-users';
                mainContainer.appendChild(noneTeamUsers);

                let noTeamTitle = document.createElement('legend');
                noTeamTitle.className = 'teams-none-team-title';
                noTeamTitle.innerHTML = 'Users without team';
                noneTeamUsers.appendChild(noTeamTitle);

                let noneTeamUsersList = tool.noTeamUsersList = document.createElement('DIV');
                noneTeamUsersList.className = 'teams-none-team-users-list';
                noneTeamUsers.appendChild(noneTeamUsersList);
            },
            reloadTeamsAndUsersUI: function () {
                console.log('reloadTeamsAndUsersUI');
                var tool = this;
                if(!tool.teamsListEl) {
                    return;
                }
                for (let i = tool.teams.length - 1; i >= 0; i--) {
                    if (!tool.teams[i].teamItemEl) {
                        let teamItemCon = document.createElement('fieldset');
                        teamItemCon.className = 'teams-item';
                        tool.teamsListEl.insertBefore(teamItemCon, tool.teamsListEl.firstChild);

                        let teamTitle = document.createElement('LEGEND')
                        teamTitle.className = 'teams-item-title';
                        teamTitle.setAttribute("contenteditable", 'plaintext-only');
                        teamTitle.innerHTML = tool.teams[i].name;
                        teamItemCon.appendChild(teamTitle);

                        teamTitle.addEventListener('blur', function () {
                            tool.changeTeamName(tool.teams[i].teamId, teamTitle.innerText);
                        });

                        let teamInfo = document.createElement('DIV');
                        teamInfo.className = 'teams-item-info';
                        teamItemCon.appendChild(teamInfo);

                        let teamParticipants = document.createElement('DIV');
                        teamParticipants.className = 'teams-item-users';
                        teamInfo.appendChild(teamParticipants);

                        let buttons = document.createElement('DIV');
                        buttons.className = 'teams-item-buttons';
                        teamInfo.appendChild(buttons);

                        let moveToThisTeam = document.createElement('BUTTON');
                        moveToThisTeam.className = 'teams-item-switch';
                        moveToThisTeam.innerHTML = 'Move to this team';
                        buttons.appendChild(moveToThisTeam);

                        moveToThisTeam.addEventListener('click', function () {
                            tool.switchTeam(tool.teams[i].teamId);
                        });

                        tool.teams[i].teamItemEl = teamItemCon;
                        tool.teams[i].teamTitleEl = teamTitle;
                        tool.teams[i].teamParticipantsEl = teamParticipants;
                    } else {
                        tool.teams[i].teamTitleEl.innerHTML = tool.teams[i].name;
                    }

                    for (let p = tool.participants.length - 1; p >= 0; p--) {
                        if(tool.participants[p].teamId == tool.teams[i].teamId) {
                            if(tool.participants[p].currentTeamInstance == tool.teams[i]) {
                                continue;
                            }

                            tool.participants[p].currentTeamInstance = tool.teams[i];

                            if(tool.participants[p].userItemEl) {
                                tool.teams[i].teamParticipantsEl.appendChild(tool.participants[p].userItemEl);
                            }

                        }
                    }
                }

                for (let p = tool.participants.length - 1; p >= 0; p--) {
                    if (!tool.participants[p].teamId) {
                        tool.participants[p].currentTeamInstance = null;
                        if (tool.participants[p].userItemEl) {
                            tool.noTeamUsersList.appendChild(tool.participants[p].userItemEl);
                        }

                    }
                }


            }
        }

    );

})(window.jQuery, window);