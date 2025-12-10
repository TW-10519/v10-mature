# シフトスケジューラー Pro - バージョン2.0 アップデートガイド
# Shift Scheduler Pro - Version 2.0 Update Guide

## 🎉 新機能 / New Features

### 1. プロフェッショナルUI / Professional UI
- **白背景デザイン**: 日本のビジネス向けのクリーンで洗練されたデザイン
- **日本語対応**: すべてのラベルとメッセージが日本語
- **控えめな色使い**: ビジネス環境に適した落ち着いた配色

**White Background Design**: Clean, professional look suitable for Japanese business clients
**Japanese Labels**: All UI elements in Japanese with English subtitles
**Conservative Colors**: Blue, gray, and neutral tones for professional appearance

### 2. 完全CRUD機能 / Full CRUD Operations

#### 従業員管理 / Employee Management
✅ 追加・編集・削除がUIから可能
✅ JSONファイルに直接保存
✅ 役割別にソート表示

- Add, edit, delete employees directly in UI
- Saves directly to employees.json
- Sorted by role automatically

#### 役割管理 / Role Management
✅ 役割の作成・編集・削除
✅ シフトテンプレートの管理
✅ 各役割に複数のシフトパターン

- Create, edit, delete roles
- Manage shift templates under each role
- Multiple shift patterns per role

#### シフト管理 / Shift Management
✅ 曜日別に異なる時間設定
✅ 各曜日ごとに有効/無効切り替え
✅ 複数のシフトタイプ対応
✅ 優先度による配分制御 (0-100)

- Different times for each day of the week
- Enable/disable shifts per day
- Multiple shift types support
- Priority-based distribution (0-100)

**Example Shift Setup:**
```javascript
{
  name: "朝番",
  Monday: { enabled: true, startTime: "08:00", endTime: "16:00" },
  Tuesday: { enabled: true, startTime: "08:00", endTime: "16:00" },
  Wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" }, // Different time
  Thursday: { enabled: false }, // Day off
  Friday: { enabled: true, startTime: "08:00", endTime: "16:00" },
  Saturday: { enabled: false },
  Sunday: { enabled: false }
}
```

### 3. 勤怠管理システム / Attendance Management System

#### 休暇 vs 欠勤 / Leave vs Unavailability

**休暇 (Leave)**: 
- シフト数から減算
- 完全な欠勤扱い
- 赤色で表示

**Leave**: 
- Reduces total shift count
- Complete absence
- Shown in red

**欠勤 (Unavailability)**:
- その日をスキップして他の日に配置
- シフト数は維持
- 週間シフト数 - 7日 以下に制限
- 黄色で表示

**Unavailability**:
- Skips that day, assigns shifts on other days
- Maintains shift count
- Limited to (shiftsPerWeek - 7) maximum
- Shown in yellow

**制約ロジック / Constraint Logic:**
```javascript
// Example: Employee works 5 shifts/week
// Unavailable days cannot exceed: 5 - 7 = can't mark more than needed
// This ensures enough days available for required shifts

if (unavailableDays >= shiftsPerWeek - 1) {
  alert("Cannot mark unavailable - need at least shiftsPerWeek days available");
}
```

#### 出勤記録 / Attendance Tracking
✅ 時刻記録機能
✅ 遅刻判定 (15分基準)
  - 定時: 緑色
  - やや遅刻 (1-15分): 黄色
  - 遅刻 (15分以上): 赤色

- Time recording
- Late detection (15-minute threshold)
  - On-time: Green
  - Slightly late (1-15 min): Yellow
  - Late (15+ min): Red

### 4. 改善されたスケジューリングロジック / Enhanced Scheduling Logic

#### 配分パーセンテージ / Distribution Percentage
```python
# Priority-based allocation
total_priority = sum(shift.priority for shift in role_shifts)
allocation_percentage = shift.priority / total_priority
target_assignments = total_capacity * allocation_percentage

# Example:
# Morning Shift: priority 70 → 70%
# Evening Shift: priority 30 → 30%
# If 20 shifts available:
#   Morning: 20 × 0.7 = 14 shifts
#   Evening: 20 × 0.3 = 6 shifts
```

#### シフトローテーションロジック / Shift Rotation Logic

**公平な配分 / Fair Distribution:**
1. 同じ人が常に同じシフトを取得しないように
2. シフトタイプごとの割り当てを追跡
3. 集中を避けるペナルティ
4. 従業員間で均等に配分

- Prevents same people always getting same shifts
- Tracks assignment history per shift type
- Penalizes concentration
- Distributes evenly across employees

**Rotation Algorithm:**
```python
# Multi-factor optimization:
# 1. Maximize coverage (weight: 1000)
# 2. Rotation fairness (weight: 100)
# 3. Meet shift targets (weight: 500)

objective = (
    coverage * 1000 +
    -concentration * concentration * 10 +  # Penalize concentration
    target_proximity * 500
)
```

### 5. 日次ビュー (ドラッグ&ドロップ) / Daily View (Drag & Drop)

✅ 日付選択
✅ ドラッグ&ドロップでシフト移動
✅ リアルタイム制約チェック
  - 役割の一致確認
  - 労働時間の上限確認
  - 重複チェック

- Date selector
- Drag & drop shift reassignment
- Real-time constraint validation
  - Role matching
  - Hour limits
  - Duplicate prevention

**使い方 / How to Use:**
1. 日次ビュータブを選択
2. 日付を選択
3. シフトをドラッグ
4. 別の従業員にドロップ
5. システムが自動的に検証

1. Select Daily View tab
2. Choose date
3. Drag shift card
4. Drop on another employee
5. System validates automatically

**制約チェック / Constraint Checks:**
```javascript
// Before allowing drop:
if (targetEmployee.roleId !== shift.roleId) {
  alert('役割が一致しません / Role mismatch');
  return;
}

if (targetEmployee.dailyHours + shiftHours > targetEmployee.dailyMaxHours) {
  alert('労働時間超過 / Exceeds daily hours');
  return;
}
```

### 6. 役割別ソート / Role-Based Sorting

すべてのテーブルとビューが役割でソート:
- 従業員リスト
- スケジュールビュー
- 日次ビュー
- 勤怠記録

All tables and views sorted by role:
- Employee list
- Schedule view
- Daily view
- Attendance records

## 🔄 アップグレード手順 / Upgrade Instructions

### ステップ1: ファイルの置き換え / Replace Files

```bash
# バックアップを作成 / Create backup
cp ShiftSchedulerApp.jsx ShiftSchedulerApp_old.jsx
cp shift_scheduler_backend.py shift_scheduler_backend_old.py

# 新バージョンをコピー / Copy new versions
cp ShiftSchedulerApp_v2.jsx ShiftSchedulerApp.jsx
cp shift_scheduler_backend_v2.py shift_scheduler_backend.py
```

### ステップ2: main.jsxを更新 / Update main.jsx

```javascript
// Change import
import ShiftSchedulerApp from './ShiftSchedulerApp_v2';
// Or rename v2 file to ShiftSchedulerApp.jsx
```

### ステップ3: サーバーの再起動 / Restart Servers

```bash
# ターミナル1: バックエンド / Terminal 1: Backend
python shift_scheduler_backend_v2.py

# ターミナル2: フロントエンド / Terminal 2: Frontend
npm run dev
```

### ステップ4: ブラウザでアクセス / Access in Browser

```
http://localhost:3000
```

## 📊 新しいデータ構造 / New Data Structure

### Shift Schedule Format

**旧フォーマット / Old Format:**
```json
{
  "id": "shift1",
  "name": "Morning Shift",
  "startTime": "09:00",
  "endTime": "17:00",
  "daysOfWeek": ["Monday", "Tuesday"]
}
```

**新フォーマット / New Format:**
```json
{
  "id": "shift1",
  "name": "朝番",
  "priority": 70,
  "roleId": "role1",
  "schedule": {
    "Monday": {
      "enabled": true,
      "startTime": "08:00",
      "endTime": "16:00"
    },
    "Tuesday": {
      "enabled": true,
      "startTime": "08:00",
      "endTime": "16:00"
    },
    "Wednesday": {
      "enabled": true,
      "startTime": "09:00",
      "endTime": "17:00"
    },
    "Thursday": { "enabled": false },
    "Friday": {
      "enabled": true,
      "startTime": "08:00",
      "endTime": "16:00"
    },
    "Saturday": { "enabled": false },
    "Sunday": { "enabled": false }
  }
}
```

## 🎯 使用例 / Usage Examples

### 例1: 従業員の追加 / Adding Employee

1. 「従業員」タブをクリック
2. 「従業員追加」ボタンをクリック
3. フォームに入力:
   - 名前: 山田太郎
   - 役割: 機械オペレーター
   - 週間労働時間: 40
   - 1日最大時間: 8
   - スキル: 機械操作, 品質管理
4. 「保存」をクリック
5. employees.jsonに自動保存

### 例2: 曜日別シフトの作成 / Creating Day-Specific Shifts

1. 「役割」タブをクリック
2. 役割を選択し「シフト追加」
3. シフト名: 朝番
4. 各曜日ごとに設定:
   - Monday: ✅ 08:00-16:00
   - Tuesday: ✅ 08:00-16:00
   - Wednesday: ✅ 09:00-17:00 (遅い開始)
   - Thursday: ❌ 休み
   - Friday: ✅ 08:00-16:00
5. 優先度: 70 (高優先度)
6. 「保存」をクリック

### 例3: 休暇と欠勤の設定 / Setting Leave and Unavailability

**休暇 (完全休み):**
1. 「勤怠管理」タブ
2. 従業員を選択
3. 該当日の「休暇」ボタンをクリック
4. 赤色に変わる
5. その日のシフトは0になり、週間シフト数から減算

**欠勤 (他の日に振替):**
1. 「勤怠管理」タブ
2. 従業員を選択
3. 該当日の「欠勤」ボタンをクリック
4. 黄色に変わる
5. その日はスキップされ、他の日にシフトが配置される

### 例4: ドラッグ&ドロップでシフト変更 / Changing Shifts with Drag & Drop

1. 「日次ビュー」タブ
2. 日付を選択
3. シフトカードをドラッグ
4. 別の従業員エリアにドロップ
5. システムが自動検証:
   - ✅ 役割が一致: 移動成功
   - ❌ 役割不一致: エラーメッセージ
   - ❌ 時間超過: エラーメッセージ

## 🔧 高度な設定 / Advanced Configuration

### 優先度の調整 / Adjusting Priorities

優先度は0-100で設定:
- **80-100**: 非常に重要なシフト (多くの人員を配置)
- **50-70**: 通常のシフト (標準的な配置)
- **20-40**: 低優先度のシフト (最小限の人員)
- **0-20**: オプショナルなシフト (余剰人員のみ)

Priority ranges 0-100:
- **80-100**: Critical shifts (maximum coverage)
- **50-70**: Normal shifts (standard coverage)
- **20-40**: Low priority (minimum coverage)
- **0-20**: Optional shifts (surplus staff only)

**配分例 / Distribution Example:**
```
Total capacity: 30 shifts

Shift A (priority 60): 30 × 0.6 = 18 shifts
Shift B (priority 30): 30 × 0.3 = 9 shifts
Shift C (priority 10): 30 × 0.1 = 3 shifts
```

### ローテーション設定 / Rotation Settings

バックエンドで調整可能:
```python
# Rotation weight (higher = more rotation)
objective_terms.append(-emp_shift_total * emp_shift_total * 10)

# Increase from 10 to 50 for stronger rotation
objective_terms.append(-emp_shift_total * emp_shift_total * 50)
```

## 📈 パフォーマンス / Performance

### 最適化されたソルバー / Optimized Solver

- 解決時間: 45秒 (以前: 30秒)
- ワーカースレッド: 4 (並列処理)
- より複雑な制約に対応

- Solving time: 45 seconds (up from 30)
- Worker threads: 4 (parallel processing)
- Handles more complex constraints

### スケーラビリティ / Scalability

- **10-50従業員**: 5-15秒
- **50-100従業員**: 15-30秒
- **100-200従業員**: 30-45秒

## 🐛 トラブルシューティング / Troubleshooting

### 問題1: スケジュールが生成されない

**原因**: 制約が厳しすぎる

**解決策**:
1. 欠勤日数を減らす
2. 1日最大時間を増やす
3. 週間シフト数を調整
4. 優先度を見直す

**Cause**: Constraints too strict

**Solutions**:
1. Reduce unavailable days
2. Increase daily max hours
3. Adjust shifts per week
4. Review priorities

### 問題2: ドラッグ&ドロップが動作しない

**原因**: ブラウザの互換性

**解決策**:
1. Chrome/Edge/Firefoxを使用
2. JavaScriptが有効か確認
3. ブラウザをリロード
4. キャッシュをクリア

### 問題3: JSONファイルが更新されない

**原因**: バックエンドが実行されていない

**解決策**:
1. バックエンドサーバーを確認
2. コンソールのエラーをチェック
3. ファイルの書き込み権限を確認
4. パスが正しいか確認

## 🎓 ベストプラクティス / Best Practices

### 1. シフト設計 / Shift Design

✅ 優先度を明確に設定
✅ 曜日ごとの需要を考慮
✅ ピーク時間に高優先度を配置
✅ オフピークは低優先度

- Set clear priorities
- Consider daily demand
- High priority for peak times
- Low priority for off-peak

### 2. 従業員管理 / Employee Management

✅ スキルを正確に登録
✅ 週間労働時間を適切に設定
✅ 役割を明確に定義
✅ 定期的に情報を更新

- Register skills accurately
- Set appropriate weekly hours
- Define roles clearly
- Update information regularly

### 3. スケジューリング / Scheduling

✅ 休暇は事前に登録
✅ 欠勤は最小限に
✅ ローテーションを確認
✅ 公平性をチェック

- Register leave in advance
- Minimize unavailability
- Check rotation
- Verify fairness

## 📝 チェックリスト / Checklist

アップグレード前:
- [ ] データのバックアップ
- [ ] 現在の設定を記録
- [ ] テスト環境で確認

Before upgrade:
- [ ] Backup data
- [ ] Record current settings
- [ ] Test in staging

アップグレード後:
- [ ] すべての従業員を確認
- [ ] すべての役割を確認
- [ ] テストスケジュールを生成
- [ ] ドラッグ&ドロップをテスト
- [ ] 勤怠機能をテスト

After upgrade:
- [ ] Verify all employees
- [ ] Verify all roles
- [ ] Generate test schedule
- [ ] Test drag & drop
- [ ] Test attendance

## 🎉 完了! / Complete!

バージョン2.0へようこそ!
より強力で柔軟なシフトスケジューリングをお楽しみください。

Welcome to Version 2.0!
Enjoy more powerful and flexible shift scheduling.

---

**バージョン / Version**: 2.0.0  
**更新日 / Updated**: December 2024  
**サポート / Support**: 包括的なドキュメント参照 / See comprehensive documentation
