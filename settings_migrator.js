const DefaultSettings = {
    "autoLock":     true, // 
    "lockSpeed":      30, // delay for locking on targets.
    "autoDPS":      true, // Type: buff / debuff / dps
    "autoCleanse":  true, // enable mystic cleanse
    "autoHeal":     true, // enable healing skills
    "hpCutoff":       97, // (healing only) ignore members that have more HP% than this
    "autoCast":     true, // true = skills auto lockon and cast. false = pre-lockon onto targets and casting is done manually
    "castSpeed":     100, // delay for casting skills. castSpeed needs to be greater than lockSpeed.
    "debug":        false,
    "skills": [
        // 祭师
        {group: 19, job: 6, type: 'heal',    dist: 35, targets: 4}, // 治癒之光-治疗-最大距离-最大目标数量
        {group: 37, job: 6, type: 'heal',    dist: 35, targets: 1}, // 治癒翅膀-治疗-最大距离-最大目标数量
        {group: 30, job: 6, type: 'debuff',  dist: 30},             // 乏力預言    -驱散
        {group: 33, job: 6, type: 'debuff',  dist: 30},             // 伊莎拉搖籃曲-眩晕
        {group: 35, job: 6, type: 'buff',    dist: 25},             // 神聖閃電    -BOSS
        // 元素
        {group: 5,  job: 7, type: 'heal',    dist: 35, targets: 4}, // 恢復彈-治疗-最大距离-最大目标数量
        {group: 9,  job: 7, type: 'cleanse', dist: 35, targets: 4}, // 淨化彈-净化-最大距离-最大目标数量
        {group: 24, job: 7, type: 'debuff',  dist: 30},             // 痛苦咒縛-减速
        {group: 28, job: 7, type: 'debuff',  dist: 30},             // 流沙束縛-眩晕
        {group: 41, job: 7, type: 'dps',     dist: 30},             // 疫病猖獗-BOSS
        // 弓箭
        {group: 2,  job: 5, type: 'dps',     dist: 35},             // 多重射擊-BOSS
        // 魔道
        {group: 20, job: 4, type: 'dps',     dist: 35}              // 追蹤業火-BOSS
    ]
};

module.exports = function MigrateSettings(from_ver, to_ver, settings) {
    if (from_ver === undefined) {
        // Migrate legacy config file
        return Object.assign(Object.assign({}, DefaultSettings), settings);
    } else if (from_ver === null) {
        // No config file exists, use default settings
        return DefaultSettings;
    } else {
        // Migrate from older version (using the new system) to latest one
        if (from_ver + 1 < to_ver) { // Recursively upgrade in one-version steps
            settings = MigrateSettings(from_ver, from_ver + 1, settings);
            return MigrateSettings(from_ver + 1, to_ver, settings);
        }
        // If we reach this point it's guaranteed that from_ver === to_ver - 1, so we can implement
        // a switch for each version step that upgrades to the next version. This enables us to
        // upgrade from any version to the latest version without additional effort!
        switch (to_ver) {
            default:
                let oldsettings = settings
                settings = Object.assign(DefaultSettings, {});
                for (let option in oldsettings) {
                    if (settings[option]) {
                        settings[option] = oldsettings[option]
                    }
                }
                break;
        }
        return settings;
    }
}
