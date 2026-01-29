<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MailConfig extends Model
{
    protected $table = 'mail_configs';
    
    protected $fillable = [
        'from_email',
        'from_name',
        'reply_to_email',
        'notification_enabled',
        'smtp_host',
        'smtp_port',
        'smtp_username',
        'smtp_password',
    ];

    protected $casts = [
        'notification_enabled' => 'boolean',
        'smtp_port' => 'integer',
    ];

    /**
     * Get the default or only mail config
     */
    public static function getConfig()
    {
        return self::first() ?? new self();
    }

    /**
     * Update or create the mail config
     */
    public static function updateConfig(array $data)
    {
        $config = self::first();
        
        if ($config) {
            $config->update($data);
        } else {
            $config = self::create($data);
        }
        
        return $config;
    }
}
