<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'sector',
        'status',
        'start_date',
        'end_date',
        'client_name',
        'client_contact',
        'pipeline_stage',
        'pipeline_intake_date',
        'oem',
        'location',
        'expected_close_date',
        'business_segment',
        'product',
        'sub_product',
        'project_lead_id',
        'assignee_id',
        'channel_partner',
        'contract_value_ngn',
        'contract_value_usd',
        'margin_percent_ngn',
        'margin_percent_usd',
        'margin_value_ngn',
        'margin_value_usd',
        'project_lead_comments',
        'deal_probability',
        'progress',
        'project_image',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'pipeline_intake_date' => 'date',
        'expected_close_date' => 'date',
        'contract_value_ngn' => 'decimal:2',
        'contract_value_usd' => 'decimal:2',
        'margin_percent_ngn' => 'decimal:2',
        'margin_percent_usd' => 'decimal:2',
        'margin_value_ngn' => 'decimal:2',
        'margin_value_usd' => 'decimal:2',
        'progress' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = ['created_at_formatted'];

    public function projectLead()
    {
        return $this->belongsTo(User::class, 'project_lead_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function getCreatedAtFormattedAttribute()
    {
        return $this->created_at ? $this->created_at->format('Y-m-d H:i:s') : null;
    }
}
