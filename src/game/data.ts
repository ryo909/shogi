export interface TrumpCardData {
    id: string;
    name: string;
    category: 'TACTICS' | 'SUPPORT' | 'HYPE';
    chaos: number;
    shortText: string;
    longText: string;
    targeting: {
        requiresTarget: boolean;
        targets?: { side: string; type: string; kingAllowed?: boolean }[];
        requiresDirection?: boolean;
    };
    effect: any;
}

export interface EventData {
    id: string;
    name: string;
    category: 'EVENT';
    chaos: number;
    shortText: string;
    longText: string;
    effect: any;
    durationPly: number;
}

export const TRUMP_CARDS: TrumpCardData[] = [
    {
        "id": "BTN_BODYDOUBLE",
        "name": "影武者交換",
        "category": "TACTICS",
        "chaos": 3,
        "shortText": "敵味方1枚を交換",
        "longText": "自分の駒1枚と相手の駒1枚の位置を入れ替える。玉は対象外。",
        "targeting": {
            "requiresTarget": true,
            "targets": [
                { "side": "SELF", "type": "PIECE", "kingAllowed": false },
                { "side": "OPP", "type": "PIECE", "kingAllowed": false }
            ]
        },
        "effect": { "type": "SWAP_POSITIONS", "durationPly": 0 }
    },
    {
        "id": "BTN_PUSHBACK",
        "name": "突き返し",
        "category": "TACTICS",
        "chaos": 2,
        "shortText": "敵駒を1マス押す",
        "longText": "相手の駒1枚を任意方向に1マス押す。押した先が空マスのときのみ。玉は対象外。",
        "targeting": {
            "requiresTarget": true,
            "targets": [{ "side": "OPP", "type": "PIECE", "kingAllowed": false }],
            "requiresDirection": true
        },
        "effect": { "type": "PUSH_ONE", "requiresEmptyDestination": true, "durationPly": 0 }
    },
    {
        "id": "BTN_CHECKPOINT",
        "name": "関所",
        "category": "TACTICS",
        "chaos": 2,
        "shortText": "指定マス進入禁止",
        "longText": "空マス1つを指定し、次の2手（両者）そのマスへ進入できない。",
        "targeting": { "requiresTarget": true, "targets": [{ "side": "BOARD", "type": "SQUARE_EMPTY" }] },
        "effect": { "type": "FORBID_ENTER_SQUARE", "durationPly": 2, "appliesTo": "BOTH" }
    },
    {
        "id": "BTN_PIN",
        "name": "足止め",
        "category": "TACTICS",
        "chaos": 2,
        "shortText": "敵駒を1手停止",
        "longText": "相手の駒1枚を指定し、次の相手手番はその駒を動かせない。玉は対象外。",
        "targeting": { "requiresTarget": true, "targets": [{ "side": "OPP", "type": "PIECE", "kingAllowed": false }] },
        "effect": { "type": "FREEZE_PIECE", "durationTurn": 1, "affectsSide": "OPP_NEXT_TURN_ONLY" }
    },
    {
        "id": "BTN_REINFORCEMENT",
        "name": "援軍",
        "category": "SUPPORT",
        "chaos": 1,
        "shortText": "歩+2を補充",
        "longText": "自分の持ち駒に歩を2枚追加する。",
        "targeting": { "requiresTarget": false },
        "effect": { "type": "ADD_TO_HAND", "piece": "P", "count": 2, "durationPly": 0 }
    },
    {
        "id": "BTN_SCORCHED",
        "name": "焼却命令",
        "category": "SUPPORT",
        "chaos": 2,
        "shortText": "取られても渡さない",
        "longText": "次に自分の駒が取られるとき、その駒は相手の持ち駒にならず消滅する。玉は対象外／1回限り。",
        "targeting": { "requiresTarget": false },
        "effect": {
            "type": "DENY_CAPTURE_TO_HAND_ONCE",
            "durationUntilTriggers": true,
            "maxTriggers": 1,
            "kingProtected": true
        }
    },
    {
        "id": "BTN_WITHDRAW",
        "name": "撤収",
        "category": "SUPPORT",
        "chaos": 2,
        "shortText": "自駒を回収",
        "longText": "盤上の自分の駒1枚を持ち駒に戻す。玉は対象外。戻した駒は次の自分手番まで打てない。",
        "targeting": { "requiresTarget": true, "targets": [{ "side": "SELF", "type": "PIECE", "kingAllowed": false }] },
        "effect": { "type": "RECALL_TO_HAND", "cooldown": { "cannotDropUntilNextOwnTurn": true }, "durationPly": 0 }
    },
    {
        "id": "BTN_SANDBAGS",
        "name": "土嚢設置",
        "category": "SUPPORT",
        "chaos": 1,
        "shortText": "自陣に歩を設置",
        "longText": "自陣の空マスに歩を1枚配置できる（二歩は禁止のまま）。",
        "targeting": { "requiresTarget": true, "targets": [{ "side": "BOARD", "type": "SQUARE_EMPTY_OWN_TERRITORY" }] },
        "effect": { "type": "PLACE_PAWN_ON_BOARD", "respectNormalRules": ["NO_NI-FU"], "durationPly": 0 }
    },
    {
        "id": "BTN_PURSUIT",
        "name": "追撃命令",
        "category": "HYPE",
        "chaos": 3,
        "shortText": "取ったら追加移動",
        "longText": "この手番で駒を取った場合、その駒で続けてもう1回だけ動ける（2回目の移動では駒を取れない）。",
        "targeting": { "requiresTarget": false },
        "effect": {
            "type": "EXTRA_MOVE_AFTER_CAPTURE",
            "extraMoveRules": { "mustUseCapturingPiece": true, "secondMoveCannotCapture": true },
            "durationTurn": 1
        }
    },
    {
        "id": "BTN_DOUBLEDEPLOY",
        "name": "二連投入",
        "category": "HYPE",
        "chaos": 3,
        "shortText": "打ちを2回",
        "longText": "この手番だけ持ち駒を2回打てる（2回目は歩を打てない）。二歩など通常禁則は維持。",
        "targeting": { "requiresTarget": false },
        "effect": {
            "type": "DOUBLE_DROP_THIS_TURN",
            "restrictions": { "secondDropForbiddenPieces": ["P"], "respectNormalRules": ["NO_NI-FU"] },
            "durationTurn": 1
        }
    },
    {
        "id": "BTN_ESCORT",
        "name": "護衛",
        "category": "HYPE",
        "chaos": 2,
        "shortText": "自駒に護衛付与",
        "longText": "自分の駒1枚を指定し、次の自分手番開始まで取られない。玉は対象外。",
        "targeting": { "requiresTarget": true, "targets": [{ "side": "SELF", "type": "PIECE", "kingAllowed": false }] },
        "effect": { "type": "IMMUNE_TO_CAPTURE", "durationUntilNextOwnTurnStart": true }
    },
    {
        "id": "BTN_BOUNTY",
        "name": "懸賞首",
        "category": "HYPE",
        "chaos": 2,
        "shortText": "標的に賞金",
        "longText": "相手の駒1枚に印。次にその駒が取られたら自分は歩+1獲得（持ち駒）。玉は対象外。",
        "targeting": { "requiresTarget": true, "targets": [{ "side": "OPP", "type": "PIECE", "kingAllowed": false }] },
        "effect": {
            "type": "MARK_PIECE_BOUNTY",
            "onMarkedCaptured": { "rewardToSide": "MARKER_OWNER", "addToHand": { "piece": "P", "count": 1 } },
            "durationUntilTriggers": true,
            "maxTriggers": 1
        }
    }
];

export const EVENTS: EventData[] = [
    {
        "id": "EV_SUPPLY",
        "name": "補給",
        "category": "EVENT",
        "chaos": 1,
        "shortText": "両者 歩+1",
        "longText": "両者、持ち駒に歩を1枚追加。",
        "effect": { "type": "ADD_TO_HAND_BOTH", "piece": "P", "count": 1 },
        "durationPly": 0
    },
    {
        "id": "EV_INSPECTION",
        "name": "検問",
        "category": "EVENT",
        "chaos": 2,
        "shortText": "次手 打ち禁止",
        "longText": "次の1手だけ、両者とも「打ち」禁止。",
        "effect": { "type": "FORBID_DROP", "appliesTo": "BOTH" },
        "durationPly": 1
    },
    {
        "id": "EV_DARKNESS",
        "name": "視界不良",
        "category": "EVENT",
        "chaos": 2,
        "shortText": "飛角 3マス制限",
        "longText": "次の1手だけ、飛・角の最大移動距離は3マスまで。",
        "effect": { "type": "LIMIT_RANGED_MOVES", "pieces": ["R", "B"], "maxDistance": 3, "appliesTo": "BOTH" },
        "durationPly": 1
    },
    {
        "id": "EV_RATIONS",
        "name": "臨時配給",
        "category": "EVENT",
        "chaos": 2,
        "shortText": "A歩+2 / B金化成り",
        "longText": "各自選ぶ。A：歩+2。B：次の1手の成りを金化として許可（成り条件は通常通り）。",
        "effect": {
            "type": "CHOICE_PER_PLAYER",
            "choices": [
                { "id": "A", "label": "歩+2", "apply": { "type": "ADD_TO_HAND", "piece": "P", "count": 2 } },
                { "id": "B", "label": "次の1手 成り=金化", "apply": { "type": "ALLOW_PROMOTE_AS_GOLD", "respectNormalPromoteZone": true } }
            ]
        },
        "durationPly": 1
    },
    {
        "id": "EV_REDEPLOY",
        "name": "再配置指令",
        "category": "EVENT",
        "chaos": 2,
        "shortText": "任意で駒を回収",
        "longText": "各自、盤上の自駒1枚を持ち駒に戻してもよい（戻した駒は次の自分手番まで打てない／玉は対象外）。",
        "effect": {
            "type": "OPTIONAL_RECALL_PER_PLAYER",
            "kingAllowed": false,
            "cooldown": { "cannotDropUntilNextOwnTurn": true }
        },
        "durationPly": 0
    },
    {
        "id": "EV_EXHAUST",
        "name": "疲労",
        "category": "EVENT",
        "chaos": 3,
        "shortText": "連続同駒NG",
        "longText": "次の2手の間、両者とも同じ駒を連続で動かすのは禁止。",
        "effect": { "type": "FORBID_SAME_PIECE_CONSECUTIVE_MOVES", "appliesTo": "BOTH" },
        "durationPly": 2
    },
    {
        "id": "EV_WARDRUM",
        "name": "軍鼓",
        "category": "EVENT",
        "chaos": 2,
        "shortText": "取れたら歩+1",
        "longText": "次の1手で駒を取れたら歩+1ボーナス（両者）。",
        "effect": { "type": "BONUS_ON_CAPTURE_NEXT_TURN", "reward": { "piece": "P", "count": 1 }, "appliesTo": "BOTH" },
        "durationPly": 1
    },
    {
        "id": "EV_FIELDWORKS",
        "name": "陣地構築",
        "category": "EVENT",
        "chaos": 2,
        "shortText": "両者 自陣に歩設置",
        "longText": "両者、自陣の空マスに歩を1枚配置できる（二歩は禁止のまま）。",
        "effect": { "type": "PLACE_PAWN_OPTIONAL_BOTH", "respectNormalRules": ["NO_NI-FU"] },
        "durationPly": 0
    }
];
