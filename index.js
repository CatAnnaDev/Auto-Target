module.exports = function AutoTarget(mod) {
	const Message = require('./lib.js')
	const MSG = new Message(mod)
	
	const skills = mod.settings.skills;
	
	let job = null,
		ownX = null,
		ownY = null,
		ownZ = null,
		debug = false,
		locking = false,
		partyMembers = [],
		bossInfo = [];
	
	mod.command.add("heal", (arg) => {
		if (!arg) {
			mod.settings.autoLock = !mod.settings.autoLock;
			MSG.chat('Auto-Target ' + (mod.settings.autoLock ? MSG.BLU("ON") : MSG.YEL("OFF")));
		} else if (arg === "auto") {
			mod.settings.autoHeal = !mod.settings.autoHeal;
			MSG.chat("autoHeal " + (mod.settings.autoHeal    ? MSG.BLU("Smart lock") : MSG.YEL("Back to normal")));
		} else if (arg === "dispell") {
			mod.settings.autoCleanse = !mod.settings.autoCleanse;
			MSG.chat("autoCleanse " + (mod.settings.autoCleanse ? MSG.BLU("Smart lock") : MSG.YEL("Back to normal")));
		} else if (arg === "dps") {
			mod.settings.autoDPS = !mod.settings.autoDPS;
			MSG.chat("autoDPS " + (mod.settings.autoDPS     ? MSG.BLU("Smart lock") : MSG.YEL("Back to normal")));
		} else if (arg === 'debug') {
			mod.settings.debug = !mod.settings.debug;
			MSG.chat("Auto heal Debug " + (mod.settings.debug     ? MSG.BLU("Debug on") : MSG.YEL("Debug off")));
		}else if (arg === 'test') {
			outputDebug(0);
            return;
        } else if (arg === "cast") {
			mod.settings.autoCast = !mod.settings.autoCast;
			MSG.chat("autoCast " + (mod.settings.autoCast ? MSG.BLU("ON") : MSG.YEL("OFF")));
		} else {
			MSG.chat("Auto-Target " + MSG.RED("wrong command!"))
		}
	});
	/*
	mod.command.add('l1', () => {
		sortDistBoss();
		MSG.chat(JSON.stringify(bossInfo, null, 4));
	});
	
	mod.command.add('l2', () => {
		sortHp();
		MSG.chat(JSON.stringify(partyMembers, null, 4));
	});
		*/
	mod.game.on('enter_game', () => {
		job = (mod.game.me.templateId - 10101) % 100;
	});

	mod.hook('C_PLAYER_LOCATION', 5, { order: -10 }, (event) => {
		ownX = (event.loc.x + event.dest.x) / 2;
		ownY = (event.loc.y + event.dest.y) / 2;
		ownZ = (event.loc.z + event.dest.z) / 2;
	});
	
	mod.hook('S_PARTY_MEMBER_LIST', 7, (event) => {
		partyMembers = [];
		for (let party of event.members) {
			if (party.playerId != mod.game.me.playerId) {
				partyMembers.push({
					playerId: party.playerId,
					gameId: party.gameId,
					online: party.online,
					hpP: party.online ? 1 : 0,
					curHp: 0,
					debuff: false,
					debId: [],
					x: null,
					y: null,
					z: null,
					name: party.name
				});
			}
		}
	});
	
	mod.hook('S_LEAVE_PARTY', 1, (event) => {
		partyMembers = [];
		bossInfo = [];
		locking = false;
	});
	
	mod.hook('S_LEAVE_PARTY_MEMBER', 2, (event) => {
		partyMembers = partyMembers.filter(p => p.playerId != event.playerId);
	});
	
	mod.hook('S_PARTY_MEMBER_CHANGE_HP', 4, (event) => {
		for (let i = 0; i < partyMembers.length; i++) {
			if (partyMembers[i].playerId == event.playerId) {
				partyMembers[i].hpP = (Number(event.currentHp) / Number(event.maxHp));
				partyMembers[i].curHp = Number(event.currentHp);
				break;
			}
		}
	});
	
	mod.hook('S_LOGOUT_PARTY_MEMBER', 1, (event) => {
		for (let i = 0; i < partyMembers.length; i++) {
			if (partyMembers[i].playerId == event.playerId) {
				partyMembers[i].online = false;
				break;
			}
		}
	});
	
	mod.hook('S_USER_LOCATION', 5, { order: -10 }, (event) => {
		if (partyMembers == null) return;
		
		for (let i = 0; i < partyMembers.length; i++) {
			if (partyMembers[i].gameId == (event.gameId)) {
				partyMembers[i].x = (event.loc.x + event.dest.x) / 2;
				partyMembers[i].y = (event.loc.y + event.dest.y) / 2;
				partyMembers[i].z = (event.loc.z + event.dest.z) / 2;
				break;
			}
		}
	})
	
	mod.hook('S_ABNORMALITY_BEGIN', 3, { order: -10 }, (event) => {
		if (event.source == 0 || event.source == event.target || partyMembers == null || event.source == mod.game.me.gameId) return;
		
		for (let y = 0; y < partyMembers.length; y++) {
			if (partyMembers[y].gameId == event.source) return;
		}
		
		for (let i = 0; i < partyMembers.length; i++) {
			if (partyMembers[i].gameId == event.target) {
				partyMembers[i].debuff = true;
				partyMembers[i].debId.push(event.id);
				break;
			}
		}
	})
	
	mod.hook('S_ABNORMALITY_END', 1, { order: -10 }, (event) => {
		if (partyMembers == null) return;
		
		for (let i = 0; i < partyMembers.length; i++) {
			if (partyMembers[i].gameId == event.target) {
				let newDebId = [];
				for (let x = 0; x < partyMembers[i].debId.length; x++) {
					if (partyMembers[i].debId[x] != event.id) {
						newDebId.push(event.id);
					}
				}
				partyMembers[i].debId = newDebId;
				if (newDebId.length <= 0) partyMembers[i].debuff = false;
				break;
			}
		}
	});
	
	mod.hook('S_BOSS_GAGE_INFO', 3, { order: -10 }, (event) => {
		let alreadyHaveBoss = false;
		
		let tempPushEvent = {
			id: event.id,
			x: 99999999,
			y: 99999999,
			z: 99999999,
			w: null,
			hp: (Number(event.curHp) / Number(event.maxHp)),
			dist: 100
		}
		
		if (bossInfo.length <= 0) {
			bossInfo.push(tempPushEvent);
		} else {
			for (let b = 0; b < bossInfo.length; b++) {
				if (bossInfo[b].id == (event.id)) {
					bossInfo[b].hp = (Number(event.curHp) / Number(event.maxHp));
					alreadyHaveBoss = true;
					if (event.curHp <= 0) {
						bossInfo = bossInfo.filter(function (p) {
							return !p.id == (event.id);
						});
					}
					break;
				}
			}
			if (alreadyHaveBoss == false) {
				bossInfo.push(tempPushEvent);
			}
		}
	});
	
	mod.hook('S_ACTION_STAGE', 9, { order: -10 }, (event) => {
		if (bossInfo.length <= 0) return;
		
		for (let b = 0; b < bossInfo.length; b++) {
			if (event.gameId == (bossInfo[b].id)) {
				bossInfo[b].x = event.loc.x;
				bossInfo[b].y = event.loc.y;
				bossInfo[b].z = event.loc.z;
				bossInfo[b].w = event.w;
				bossInfo[b].dist = checkDistance(ownX, ownY, ownZ, event.loc.x, event.loc.y, event.loc.z);
				break;
			}
		}
	});
	
	mod.hook('C_START_SKILL', 7, { order: -10 }, (event) => {
		if (!mod.settings.autoLock) return;
		
		let skillInfo = getSkillInfo(event.skill.id);
		let packetSkillInfo = skills.find(o => o.group == skillInfo.group && o.job == job);
		if (!packetSkillInfo) return;
		
		if (skillInfo.sub == 10) {
			locking = false;
			if (partyMembers && packetSkillInfo.type == 'cleanse') {
				for (let i = 0; i < partyMembers.length; i++) {
					partyMembers[i].debuff = false;
					partyMembers[i].debId = [];
				}
			}
		}
		let targetMembers = [];

		if (targetMembers.length > 0) {
			if (mod.settings.debug) outputDebug(event.skill);
			
		}
		
		switch (packetSkillInfo.type) {
			case 'heal':
				if (mod.settings.autoHeal && partyMembers && partyMembers.length > 0) {
					sortHp();
					let qtdTarget = 0;
					locking = true;
					
					for (const member of partyMembers) {
						let distance = checkDistance(ownX, ownY, ownZ, member.x, member.y, member.z);
						if (distance > packetSkillInfo.dist) continue;
						if (qtdTarget > packetSkillInfo.targets) continue;
						
						if (member.curHp > 1 && member.hpP < (mod.settings.hpCutoff / 100)) {
							let newEvent = {
								target: member.gameId,
								unk: 0,
								skill: event.skill
							}
							doTimeOutLock(newEvent);
							qtdTarget++;
						}
					}
					if (mod.settings.autoCast && qtdTarget > 0) {
						doSkillActivation(event);
					}
				}
				return;
			case 'cleanse':
				if (mod.settings.autoCleanse && partyMembers && partyMembers.length > 0) {
					let qtdTarget = 0;
					locking = true;
					
					for (const member of partyMembers) {
						let distance = checkDistance(ownX, ownY, ownZ, member.x, member.y, member.z);
						if (distance > packetSkillInfo.dist) continue;
						if (qtdTarget > packetSkillInfo.targets) continue;
						
						if (member.curHp > 0 && member.debuff) {
							let newEvent = {
								target: member.gameId,
								unk: 0,
								skill: event.skill
							}
							doTimeOutLock(newEvent);
							qtdTarget++;
						}
					}
					if (mod.settings.autoCast && qtdTarget > 0) {
						doSkillActivation(event);
					}
				}
				return;
			case 'buff':
			case 'debuff':
			case 'dps':
				if (mod.settings.autoDPS && bossInfo && bossInfo.length > 0) {
					sortDistBoss();
					locking = true;
					if (bossInfo[0].dist <= packetSkillInfo.dist) {
						let newEvent = {
							target: bossInfo[0].id,
							unk: 0,
							skill: event.skill
						}
						doTimeOutLock(newEvent);
						if (mod.settings.autoCast) {
							doSkillActivation(event);
						}
					}
				}
				return;
		}
	});
	
	mod.hook('C_CANCEL_SKILL', 3, { order: -10 }, (event) => {
		let skillInfo = getSkillInfo(event.skill.id);
		let packetSkillInfo = skills.find(o => o.group == skillInfo.group && o.job == job);
		
		if (packetSkillInfo && !partyMembers) {
			locking = false;
		}
	});
	
	function getSkillInfo(id) {
		// Thanks SP2
		let nid = id;// -= 0x4000000;
		return {
			id: nid,
			group: Math.floor(nid / 10000),
			level: Math.floor(nid / 100) % 100,
			sub: nid % 100
		};
	}
	
	function doTimeOutLock(event) {
		if (!locking) return
		
		setTimeout(function() {
			mod.send('C_CAN_LOCKON_TARGET', 3, event);
			mod.send('S_CAN_LOCKON_TARGET', 3, Object.assign({ success: true }, event));
		}, mod.settings.lockSpeed);
	}
	
	function doSkillActivation(event) {
		event.skill.id = (event.skill.id + 10);
		
		setTimeout(function() {
			locking = false;
			mod.send('C_START_SKILL', 7, event);
		}, mod.settings.castSpeed);
	}
	
	function sortHp() {
		partyMembers.sort(function(a, b) {
			return parseFloat(a.hpP) - parseFloat(b.hpP);
		});
	}
	
	function sortDistBoss() {
		bossInfo.sort(function (a, b) {
			return parseFloat(a.dist) - parseFloat(b.dist);
		});
	}
	
	function checkDistance(x, y, z, x1, y1, z1) {
		return (Math.sqrt(Math.pow(x1 - x, 2) + Math.pow(y1 - y, 2) + Math.pow(z1 - z, 2))) / 25;
	}

	function outputDebug(skill) {
        let out = '\nAutoheal Debug... Skill: ' + skill.id + '\tpartyMemebers.length: ' + partyMembers.length;
        for (let i = 0; i < partyMembers.length; i++) {
            out += '\n' + i + '\t';
            let name = partyMembers[i].name;
            name += ' '.repeat(21-name.length);
            let hp = '\tHP: ' + parseFloat(partyMembers[i].hpP).toFixed(2);
            let dist = '\tundefined';
            if (partyMembers[i].loc) dist = '\tDist: ' + (partyMembers[i].loc.dist3D(playerLocation.loc) / 25).toFixed(2);
           // let vert = '\tVert: ' + (Math.abs(partyMembers[i].loc.z - playerLocation.loc.z) / 25).toFixed(2);
            let online = '\tOnline: ' + partyMembers[i].online;
            let alive = '\tAlive: ' + partyMembers[i].alive;
            let pid = '\tpid: ' + partyMembers[i].playerId + '  gid: ' + partyMembers[i].gameId  ;
            out += name + hp + dist + online + alive + pid;
        }
        console.log(out)
    }
}
